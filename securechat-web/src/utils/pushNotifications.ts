import { supabase } from '@/lib/supabaseConfig'

// Helper function to convert VAPID Base64 string to Uint8Array for the pushManager
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Registers the Service Worker in the browser.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js')
    console.log('Service Worker registered successfully:', registration)

    // Setup listener for subscription changes emitted by the SW
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        // Fetch current user and update the subscription automatically
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('unique_id')
            .eq('auth_id', user.id)
            .single()

          if (userProfile) {
            await updateSubscriptionInDB(userProfile.unique_id, event.data.payload)
          }
        }
      }
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Requests permission from the user to show notifications.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser.')
    return 'denied'
  }
  return await Notification.requestPermission()
}

/**
 * Subscribes the browser to the Web Push service and saves it to Supabase.
 */
export const subscribeToPush = async (
  userUniqueId: number, 
  vapidPublicKey: string
): Promise<boolean> => {
  try {
    const registration = await registerServiceWorker()
    if (!registration) return false

    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.')
      return false
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource
      })
    }

    // Save to Database
    await updateSubscriptionInDB(userUniqueId, subscription)
    return true
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return false
  }
}

/**
 * Saves or Updates the Push Subscription in the Supabase Database.
 */
const updateSubscriptionInDB = async (userUniqueId: number, subscription: PushSubscription | any) => {
  const p256dh = subscription.keys ? subscription.keys.p256dh : subscription.getKey('p256dh')
  const auth = subscription.keys ? subscription.keys.auth : subscription.getKey('auth')

  const p256dhStr = p256dh instanceof ArrayBuffer 
    ? btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh) as unknown as number[])) 
    : p256dh
    
  const authStr = auth instanceof ArrayBuffer 
    ? btoa(String.fromCharCode.apply(null, new Uint8Array(auth) as unknown as number[])) 
    : auth

  const { error } = await supabase
    .from('web_push_subscriptions')
    .upsert({
      user_unique_id: userUniqueId,
      endpoint: subscription.endpoint,
      p256dh: p256dhStr,
      auth: authStr,
      user_agent: navigator.userAgent,
      is_active: true,
      last_used_at: new Date().toISOString()
    }, { onConflict: 'endpoint' })

  if (error) {
    console.error('Error saving subscription to DB:', error)
  }
}

/**
 * Unsubscribes from push notifications and removes the database record.
 * Call this on user logout or when they manually disable notifications.
 */
export const unsubscribeFromPush = async (userUniqueId: number): Promise<void> => {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Remove from Database
      await supabase
        .from('web_push_subscriptions')
        .delete()
        .eq('user_unique_id', userUniqueId)
        .eq('endpoint', subscription.endpoint)
    }
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
  }
}

/*
 * ==========================================
 * INTEGRATION INTO REACT APP
 * ==========================================
 * 
 * 1. Import this file in your App.tsx or a high-level layout component:
 *    import { subscribeToPush, unsubscribeFromPush } from '@/utils/pushNotifications'
 * 
 * 2. After a user successfully logs in, call:
 *    await subscribeToPush(user.unique_id, import.meta.env.VITE_VAPID_PUBLIC_KEY)
 * 
 * 3. When a user logs out, call:
 *    await unsubscribeFromPush(user.unique_id)
 * 
 * 4. Add VITE_VAPID_PUBLIC_KEY to your frontend .env file.
 */
