import { jsPDF } from 'jspdf'

export interface ChatExportMessage {
  sender: string
  content: string
  timestamp: string
}

export async function exportToPDF(messages: ChatExportMessage[], chatName: string): Promise<Blob> {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Chat: ${chatName}`, 20, 20)
  doc.setFontSize(10)
  doc.text(`Exported: ${new Date().toLocaleString()}`, 20, 28)
  doc.line(20, 32, 190, 32)

  let y = 40
  for (const msg of messages) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`${msg.sender} - ${new Date(msg.timestamp).toLocaleString()}`, 20, y)
    y += 5
    doc.setFontSize(11)
    doc.setTextColor(0)
    const lines = doc.splitTextToSize(msg.content, 170)
    doc.text(lines, 20, y)
    y += lines.length * 5 + 5
  }

  return doc.output('blob')
}

export function exportToTXT(messages: ChatExportMessage[], chatName: string): Blob {
  const header = `Chat: ${chatName}\nExported: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`
  const body = messages
    .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.content}`)
    .join('\n\n')
  return new Blob([header + body], { type: 'text/plain' })
}

export function exportToJSON(messages: ChatExportMessage[], chatName: string): Blob {
  const data = {
    chatName,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages,
  }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
