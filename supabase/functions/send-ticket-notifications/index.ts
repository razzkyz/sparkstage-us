import { serve } from '../_shared/deps.ts'
import { getCorsHeaders, handleCors, jsonErrorWithDetails } from '../_shared/http.ts'
import { createServiceClient } from '../_shared/supabase.ts'

// Types
type SendNotificationRequest = {
  order_id: number
  order_number: string
  customer_email?: string
  customer_phone?: string
  customer_name?: string
  send_whatsapp?: boolean
  send_email?: boolean
}

// Generate a simple QR-like representation of the barcode (in production, use a proper QR library)
function generateBarcodeHTML(barcode: string): string {
  return `
    <div style="text-align: center; margin: 20px 0;">
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${barcode}</p>
      <p style="font-size: 12px; color: #666;">Scan this barcode at entrance</p>
    </div>
  `
}

// Format email with ticket details
async function getTicketEmailContent(supabase: any, orderId: number, customerName: string): Promise<{ subject: string; html: string }> {
  try {
    // Fetch ticket details
    const { data: tickets, error } = await supabase
      .from('purchased_tickets')
      .select('ticket_code, valid_date, time_slot')
      .eq('order_id', orderId)

    if (error || !tickets || tickets.length === 0) {
      throw new Error('Failed to fetch ticket details')
    }

    const ticketList = tickets
      .map((ticket: any) => {
        const date = new Date(ticket.valid_date).toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const time = ticket.time_slot ? ` at ${ticket.time_slot}` : ''
        return `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <p><strong>Ticket Code:</strong> <code style="font-family: monospace;">${ticket.ticket_code}</code></p>
            <p><strong>Date:</strong> ${date}${time}</p>
            ${generateBarcodeHTML(ticket.ticket_code)}
          </div>
        `
      })
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff4b86 0%, #e63d75 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px 0; }
          .ticket { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Spark Stage! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName || 'Valued Guest'},</p>
            <p>Thank you for purchasing your ticket! We're excited to see you at Spark Stage.</p>
            
            <h2>⏰ Important Reminder:</h2>
            <p><strong>Please arrive 15-20 minutes early</strong> to allow time for check-in and settling in.</p>
            
            <h2>🎫 Your Tickets:</h2>
            ${ticketList}
            
            <h2>📋 Entrance Instructions:</h2>
            <ol>
              <li>Show the barcode above to our staff at the entrance</li>
              <li>Staff will scan or manually enter the code</li>
              <li>Proceed to your designated area</li>
            </ol>
            
            <h2>✨ You've Earned Loyalty Points!</h2>
            <p>You've earned 1 point for each ticket purchased. Collect points for exclusive rewards!</p>
            
            <p style="margin-top: 30px;">If you have any questions, feel free to contact us.</p>
            <p>See you soon!</p>
          </div>
          <div class="footer">
            <p>© 2026 Spark Stage. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return {
      subject: `Your Spark Stage Tickets - ${tickets[0]?.ticket_code || 'Order'}`,
      html,
    }
  } catch (error) {
    console.error('Error generating email content:', error)
    throw error
  }
}

// Format WhatsApp message
async function getWhatsAppMessage(supabase: any, orderId: number, customerName: string): Promise<string> {
  try {
    const { data: tickets } = await supabase
      .from('purchased_tickets')
      .select('ticket_code, valid_date, time_slot')
      .eq('order_id', orderId)
      .limit(1)

    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets found')
    }

    const ticket = tickets[0]
    const date = new Date(ticket.valid_date).toLocaleDateString('id-ID')
    const time = ticket.time_slot ? ` at ${ticket.time_slot}` : ''

    return `
Hi ${customerName}! 👋

Your Spark Stage ticket is ready! 🎉

📅 Date: ${date}${time}
🎫 Code: ${ticket.ticket_code}

⏰ *Please arrive 15-20 minutes early!*

Show this barcode at entrance and you're all set! Have fun! ✨

Questions? Contact our support team.
    `.trim()
  } catch (error) {
    console.error('Error generating WhatsApp message:', error)
    throw error
  }
}

// Send email (mock implementation - integrate with actual email service like SendGrid)
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Integrate with SendGrid or similar email service
    // For now, just log it
    console.log(`[EMAIL] To: ${to}`)
    console.log(`[EMAIL] Subject: ${subject}`)
    console.log(`[EMAIL] HTML: ${html.substring(0, 100)}...`)
    
    // In production, call your email service API here
    // const response = await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
    
    return {
      success: true,
      message: 'Email queued for sending',
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// Send WhatsApp message (mock implementation - integrate with Twilio or similar)
async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Integrate with Twilio or similar WhatsApp service
    // For now, just log it
    console.log(`[WHATSAPP] To: ${phoneNumber}`)
    console.log(`[WHATSAPP] Message: ${message}`)
    
    // In production, call your WhatsApp service API here
    // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/...', { ... })
    
    return {
      success: true,
      message: 'WhatsApp message queued for sending',
    }
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp',
    }
  }
}

// Award loyalty points
async function awardLoyaltyPoints(
  supabase: any,
  userId: string,
  orderId: number,
  ticketQuantity: number
): Promise<{ success: boolean; points: number; message: string }> {
  try {
    const { data, error } = await supabase.rpc('award_loyalty_points', {
      p_user_id: userId,
      p_order_id: orderId,
      p_ticket_quantity: ticketQuantity,
      p_reason: 'Ticket purchase reward',
    })

    if (error) {
      throw new Error(`Failed to award points: ${error.message}`)
    }

    const result = Array.isArray(data) ? data[0] : data
    const points = (result as any)?.points_awarded || 0

    return {
      success: true,
      points,
      message: `Successfully awarded ${points} loyalty points`,
    }
  } catch (error) {
    console.error('Error awarding loyalty points:', error)
    return {
      success: false,
      points: 0,
      message: error instanceof Error ? error.message : 'Failed to award loyalty points',
    }
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Parse request
    const payload: SendNotificationRequest = await req.json()

    const {
      order_id,
      order_number,
      customer_email,
      customer_phone,
      customer_name = 'Guest',
      send_email = true,
      send_whatsapp = true,
    } = payload

    if (!order_id || !order_number) {
      return new Response(
        JSON.stringify(jsonErrorWithDetails('Missing required fields: order_id, order_number', 400)),
        { status: 400, headers: getCorsHeaders() }
      )
    }

    // Initialize Supabase client
    const supabase = createServiceClient()

    // Fetch order and ticket details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, order_items(quantity)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify(jsonErrorWithDetails(`Order not found: ${orderError?.message}`, 404)),
        { status: 404, headers: getCorsHeaders() }
      )
    }

    const userId = order.user_id
    if (!userId) {
      return new Response(
        JSON.stringify(jsonErrorWithDetails('Order has no associated user', 400)),
        { status: 400, headers: getCorsHeaders() }
      )
    }

    // Calculate total ticket quantity
    const totalQuantity = (order.order_items as any[])?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0

    const results = {
      email_sent: false,
      whatsapp_sent: false,
      loyalty_points_awarded: false,
      errors: [] as string[],
    }

    // Send email
    if (send_email && customer_email) {
      try {
        const { subject, html } = await getTicketEmailContent(supabase, order_id, customer_name)
        const emailResult = await sendEmail(customer_email, subject, html)
        results.email_sent = emailResult.success
        if (!emailResult.success) {
          results.errors.push(`Email: ${emailResult.message}`)
        }
      } catch (error) {
        results.errors.push(`Email error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Send WhatsApp
    if (send_whatsapp && customer_phone) {
      try {
        const message = await getWhatsAppMessage(supabase, order_id, customer_name)
        const whatsappResult = await sendWhatsApp(customer_phone, message)
        results.whatsapp_sent = whatsappResult.success
        if (!whatsappResult.success) {
          results.errors.push(`WhatsApp: ${whatsappResult.message}`)
        }
      } catch (error) {
        results.errors.push(`WhatsApp error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Award loyalty points
    if (totalQuantity > 0) {
      try {
        const pointsResult = await awardLoyaltyPoints(supabase, userId, order_id, totalQuantity)
        results.loyalty_points_awarded = pointsResult.success
        if (!pointsResult.success) {
          results.errors.push(`Loyalty points: ${pointsResult.message}`)
        }
      } catch (error) {
        results.errors.push(`Loyalty points error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Return response
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
    })
  } catch (error) {
    console.error('Error in send-ticket-notifications:', error)
    return new Response(
      JSON.stringify(jsonErrorWithDetails(
        error instanceof Error ? error.message : 'Internal server error',
        500
      )),
      { status: 500, headers: getCorsHeaders() }
    )
  }
})
