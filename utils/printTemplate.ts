export const generateOrderHtml = (order: any, brandName: string, logoUrl?: string) => {
  const customerName = order.customerName || "Consumidor";
  const items = Array.isArray(order.items) ? order.items : [];
  
  // Atualizado para incluir a observação do item, se existir
  const itemsHtml = items.map((item: any) => `
    <div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
        <span style="flex: 1;">${item.quantity}x ${item.name}</span>
        <span style="margin-left: 10px;">R$ ${Number(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${item.observation ? `
        <div style="font-size: 12px; font-style: italic; margin-top: 2px; line-height: 1.2;">
          Obs: ${item.observation}
        </div>
      ` : ''}
    </div>
  `).join('');

  // Lógica para identificar se é mesa
  const isMesa = order.mesa || order.deliveryMethod === 'MESA';
  const numeroMesa = order.mesa || (order.address ? order.address.replace('Mesa ', '') : '');

  return `
    <html>
      <body style="width: 80mm; padding: 10px; font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.4;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          ${logoUrl ? `<img src="${logoUrl}" style="max-width: 120px; margin-bottom: 5px;" />` : `<h2 style="margin:0">${brandName}</h2>`}
          <div style="font-size: 18px; font-weight: bold;">PEDIDO #${order.displayId}</div>
          <div style="font-size: 12px;">${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
        </div>

        <div style="margin-bottom: 10px;">
          <div style="font-weight: bold;">CLIENTE:</div>
          <div>${customerName}</div>
          <div style="font-size: 12px;">Tel: ${order.customerPhone}</div>
        </div>

        <!-- DESTAQUE DO MÉTODO DE ENTREGA OU MESA -->
        <div style="margin-bottom: 10px; padding: 8px; border: ${isMesa ? '2px solid #000' : '1px solid #000'}; text-align: ${isMesa ? 'center' : 'left'};">
          ${isMesa ? `
            <div style="font-size: 22px; font-weight: 900; letter-spacing: 2px;">
              MESA ${numeroMesa}
            </div>
          ` : `
            <div><strong>TIPO:</strong> ${order.deliveryMethod === 'delivery' ? 'ENTREGA (MOTOBOY)' : 'RETIRADA NO BALCÃO'}</div>
            ${order.deliveryMethod === 'delivery' && order.address ? `<div style="margin-top: 4px;"><strong>END:</strong> ${order.address}</div>` : ''}
          `}
          
          <div style="margin-top: ${isMesa ? '8px' : '4px'}; border-top: ${isMesa ? '1px dashed #000' : 'none'}; padding-top: ${isMesa ? '5px' : '0'}; font-size: 14px;">
            <strong>PAGAMENTO:</strong> ${order.paymentMethod || 'A combinar'}
          </div>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">ITENS:</div>
          ${itemsHtml}
        </div>

        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold;">TOTAL: R$ ${Number(order.total).toFixed(2)}</div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #000; padding-top: 10px;">
          Impresso via MenuFlow SaaS
        </div>
      </body>
    </html>
  `;
};