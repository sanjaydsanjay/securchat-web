import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { verifyAuth } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'

interface ExportRequest {
  chat_id: string
  format: 'json' | 'pdf'
  include_deleted?: boolean
}

serve(async (req: Request) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Verify JWT & Extract User
    const user = await verifyAuth(req)
    const body: ExportRequest = await req.json()

    if (!body.chat_id || !body.format) {
      return new Response('chat_id and format (json|pdf) are required', { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Fetch the user's unique_id
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('unique_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile) throw new Error('User profile not found')
    const userUniqueId = userProfile.unique_id

    // 3. Authorization Check: Does chat belong to user?
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', body.chat_id)
      .single()

    if (chatError || !chat) {
      return new Response('Chat not found', { status: 404 })
    }

    if (chat.participant_1_id !== userUniqueId && chat.participant_2_id !== userUniqueId) {
      return new Response('Unauthorized to export this chat', { status: 403 })
    }

    // 4. Rate Limiting Check (Max 1 export per 5 minutes per user)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString()
    const { count: recentExports } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'chat.export')
      .eq('metadata->>user_id', user.id)
      .gte('created_at', fiveMinutesAgo)

    if (recentExports && recentExports > 0) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait 5 minutes before exporting again.' }), { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 5. Audit Logging
    await supabaseAdmin.from('audit_logs').insert({
      action: 'chat.export',
      resource_type: 'chat',
      resource_id: body.chat_id,
      description: `User exported chat in ${body.format} format`,
      metadata: { user_id: user.id, format: body.format }
    })

    // 6. Data Streaming Pipeline
    const includeDeleted = body.include_deleted === true
    const BATCH_SIZE = 1000

    if (body.format === 'json') {
      // Memory-Efficient JSON Streaming using ReadableStream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode('[\n'))
          
          let offset = 0
          let isFirst = true

          while (true) {
            let query = supabaseAdmin
              .from('messages')
              .select('id, content, created_at, sender_unique_id, media_url')
              .eq('chat_id', body.chat_id)
              .order('created_at', { ascending: true })
              .range(offset, offset + BATCH_SIZE - 1)
            
            // If the schema uses soft deletes (e.g. is_deleted column)
            // (Assumes is_deleted exists based on common soft-delete practices; adapt if necessary)
            // if (!includeDeleted) query = query.is('is_deleted', false)

            const { data: messages, error } = await query

            if (error) {
              console.error('Stream error:', error)
              controller.error(error)
              break
            }

            if (!messages || messages.length === 0) break

            for (const msg of messages) {
              if (!isFirst) controller.enqueue(encoder.encode(',\n'))
              
              const formattedMsg = {
                id: msg.id,
                sender: msg.sender_unique_id === userUniqueId ? 'Me' : `User_${msg.sender_unique_id}`,
                timestamp: msg.created_at,
                content: msg.content,
                attachment: msg.media_url ? `Attached File: ${msg.media_url}` : null
              }

              controller.enqueue(encoder.encode(JSON.stringify(formattedMsg, null, 2)))
              isFirst = false
            }

            offset += BATCH_SIZE
          }
          
          controller.enqueue(encoder.encode('\n]'))
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="chat_export_${body.chat_id}.json"`
        }
      })
    } 
    
    else if (body.format === 'pdf') {
      // PDF Generation using pdf-lib
      // Note: For massive chats, a temporary signed URL in Storage is recommended.
      // We will build the PDF in memory. If it gets too large, it might hit the 150MB Deno limit.
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      
      let page = pdfDoc.addPage()
      const { width, height } = page.getSize()
      let y = height - 50
      const fontSize = 10

      page.drawText(`Chat Export: ${body.chat_id}`, { x: 50, y, size: 16, font: boldFont })
      y -= 30

      let offset = 0
      while (true) {
        let query = supabaseAdmin
          .from('messages')
          .select('id, content, created_at, sender_unique_id, media_url')
          .eq('chat_id', body.chat_id)
          .order('created_at', { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1)

        const { data: messages } = await query
        if (!messages || messages.length === 0) break

        for (const msg of messages) {
          if (y < 50) {
            page = pdfDoc.addPage()
            y = height - 50
          }

          const senderName = msg.sender_unique_id === userUniqueId ? 'Me' : `User_${msg.sender_unique_id}`
          const dateStr = new Date(msg.created_at).toLocaleString()
          const headerText = `[${dateStr}] ${senderName}:`
          
          page.drawText(headerText, { x: 50, y, size: fontSize, font: boldFont, color: rgb(0.2, 0.2, 0.8) })
          y -= 15

          const content = msg.content || (msg.media_url ? '[Media Attachment]' : '')
          // Simple text wrapping (approximate)
          const maxChars = 90
          for (let i = 0; i < content.length; i += maxChars) {
            if (y < 50) {
              page = pdfDoc.addPage()
              y = height - 50
            }
            page.drawText(content.substring(i, i + maxChars), { x: 50, y, size: fontSize, font })
            y -= 15
          }
          y -= 10 // Space between messages
        }
        offset += BATCH_SIZE
      }

      const pdfBytes = await pdfDoc.save()
      
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="chat_export_${body.chat_id}.pdf"`
        }
      })
    } else {
      return new Response('Unsupported format', { status: 400 })
    }

  } catch (error) {
    return handleError(error)
  }
})

/*
 * ==========================================
 * DEPLOYMENT & FRONTEND INTEGRATION
 * ==========================================
 * 
 * 1. Deploy the Edge Function:
 *    supabase functions deploy export-chat --no-verify-jwt
 * 
 * 2. Frontend Integration (React):
 *    To properly trigger a file download from an authenticated Edge Function in React, 
 *    you CANNOT just use a standard <a href="..."> tag because it won't send the JWT.
 *    Instead, use fetch(), convert the response to a Blob, and trigger an object URL download:
 * 
 *    async function handleExport(chatId: string, format: 'json' | 'pdf') {
 *      const { data: { session } } = await supabase.auth.getSession();
 *      
 *      const response = await fetch('https://<PROJECT_REF>.supabase.co/functions/v1/export-chat', {
 *        method: 'POST',
 *        headers: {
 *          'Authorization': `Bearer ${session?.access_token}`,
 *          'Content-Type': 'application/json'
 *        },
 *        body: JSON.stringify({ chat_id: chatId, format, include_deleted: false })
 *      });
 * 
 *      if (!response.ok) {
 *        const err = await response.json();
 *        alert('Export failed: ' + err.error);
 *        return;
 *      }
 * 
 *      // Convert to blob and download securely
 *      const blob = await response.blob();
 *      const downloadUrl = window.URL.createObjectURL(blob);
 *      const link = document.createElement('a');
 *      link.href = downloadUrl;
 *      link.download = `export_${chatId}.${format}`;
 *      document.body.appendChild(link);
 *      link.click();
 *      link.remove();
 *      window.URL.revokeObjectURL(downloadUrl);
 *    }
 */
