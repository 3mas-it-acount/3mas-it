// Script to fix missing uploadedBy for TicketAttachment
// Usage: node backend/database/fix_attachment_uploaders.js

const { sequelize, Ticket, TicketAttachment } = require('../models');

async function fixUploaders() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Find attachments with missing uploadedBy
    const attachments = await TicketAttachment.findAll({
      where: { uploadedBy: null },
    });
    console.log(`Found ${attachments.length} attachments with missing uploader.`);

    let updated = 0;
    for (const att of attachments) {
      // Try to get the ticket
      const ticket = await Ticket.findByPk(att.ticketId);
      if (ticket && ticket.createdBy) {
        att.uploadedBy = ticket.createdBy;
        await att.save();
        updated++;
        console.log(`Updated attachment ${att.id} with uploader ${ticket.createdBy}`);
      } else {
        console.log(`Could not find ticket or creator for attachment ${att.id}`);
      }
    }
    console.log(`Done. Updated ${updated} attachments.`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating attachments:', err);
    process.exit(1);
  }
}

fixUploaders(); 