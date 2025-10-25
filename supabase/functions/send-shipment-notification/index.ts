import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'shipped' | 'out_for_delivery' | 'delivered' | 'exception' | 'delayed';
  shipmentId: number;
  orderId?: number;
  customerEmail: string;
  customerName?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, shipmentId, orderId, customerEmail, customerName }: NotificationPayload = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get shipment info
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*, order_shipments(*)')
      .eq('id', shipmentId)
      .single();

    if (!shipment) {
      return new Response(JSON.stringify({ error: 'Shipment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get company branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, email, settings')
      .eq('id', shipment.company_id)
      .single();

    const appUrl = Deno.env.get('APP_URL') || 'https://shiptornado.lovable.app';
    const trackingUrl = `${appUrl}/track/${shipment.tracking_number}`;

    // Build email content
    const emailContent = buildEmailContent(type, {
      shipment,
      trackingUrl,
      customerName,
      companyName: company?.name || 'Ship Tornado'
    });

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${company?.name || 'Ship Tornado'} <notifications@shiptornado.com>`,
        to: [customerEmail],
        subject: emailContent.subject,
        html: emailContent.html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      
      // Log failed notification
      await supabase.from('customer_notifications').insert({
        shipment_id: shipmentId,
        order_id: orderId,
        notification_type: type,
        channel: 'email',
        recipient: customerEmail,
        status: 'failed',
        error_message: error
      });
      
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log successful notification
    await supabase.from('customer_notifications').insert({
      shipment_id: shipmentId,
      order_id: orderId,
      notification_type: type,
      channel: 'email',
      recipient: customerEmail,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildEmailContent(type: string, data: any) {
  const { shipment, trackingUrl, customerName, companyName } = data;
  
  const deliveryDate = shipment.estimated_delivery_date 
    ? new Date(shipment.estimated_delivery_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    : 'TBD';

  const templates = {
    shipped: {
      subject: `📦 Your order has shipped!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Your package is on its way!</h1>
          <p>Hi ${customerName || 'there'},</p>
          <p>Great news! Your order has been shipped via <strong>${shipment.carrier} ${shipment.service}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Tracking Number:</strong> ${shipment.tracking_number}</p>
            <p style="margin: 10px 0 0 0;"><strong>Estimated Delivery:</strong> ${deliveryDate}</p>
          </div>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Track Your Package
          </a>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This package is being delivered by ${companyName}
          </p>
        </div>
      `
    },
    out_for_delivery: {
      subject: `🚚 Your package is out for delivery today!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Your package arrives today!</h1>
          <p>Hi ${customerName || 'there'},</p>
          <p>Your package is out for delivery and should arrive <strong>today</strong>!</p>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 18px;"><strong>📍 Estimated arrival: Today</strong></p>
            <p style="margin: 10px 0 0 0; color: #6b7280;">Tracking: ${shipment.tracking_number}</p>
          </div>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            See Live Location
          </a>
        </div>
      `
    },
    delivered: {
      subject: `✅ Your package has been delivered!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Package delivered!</h1>
          <p>Hi ${customerName || 'there'},</p>
          <p>Your package has been successfully delivered.</p>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p style="margin: 0;"><strong>✓ Delivered at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>We hope you enjoy your order! If you have any questions, please contact us.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for your business!<br>
            - ${companyName}
          </p>
        </div>
      `
    },
    exception: {
      subject: `⚠️ Update on your delivery`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ea580c;">Delivery exception</h1>
          <p>Hi ${customerName || 'there'},</p>
          <p>There was an issue with your delivery. The carrier has reported an exception.</p>
          
          <div style="background: #fed7aa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
            <p style="margin: 0;"><strong>Status:</strong> Delivery exception</p>
            <p style="margin: 10px 0 0 0;">The carrier is working to resolve this issue.</p>
          </div>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Details
          </a>
          
          <p style="margin-top: 20px;">If you need assistance, please contact our support team.</p>
        </div>
      `
    },
    delayed: {
      subject: `⏰ Update on your package delivery`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ea580c;">Delivery Update</h1>
          <p>Hi ${customerName || 'there'},</p>
          <p>Your package delivery has been delayed. We apologize for the inconvenience.</p>
          
          <div style="background: #fed7aa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
            <p style="margin: 0;"><strong>New Estimated Delivery:</strong> ${deliveryDate}</p>
          </div>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Track Your Package
          </a>
        </div>
      `
    }
  };

  return templates[type as keyof typeof templates] || templates.shipped;
}
