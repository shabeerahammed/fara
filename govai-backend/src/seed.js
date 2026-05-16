const mongoose = require('mongoose');
const config = require('./config');
const CallLog = require('./models/CallLog');
const DeliveryOrder = require('./models/DeliveryOrder');
const { mockCalls, mockDeliveryOrders } = require('../../src/services/mockData'); // Path to frontend mock
require('dotenv').config({ path: '../.env' });

async function seed() {
  try {
    await mongoose.connect(config.db.uri);
    console.log('Connected. Clearing database...');
    await CallLog.deleteMany({});
    await DeliveryOrder.deleteMany({});

    console.log('Seeding CallLogs...');
    const callLogsToInsert = mockCalls.map(c => {
      let mappedStatus = c.status === 'resolved' ? 'APPROVED' : c.status === 'review' ? 'REVIEW_REQUIRED' : 'BLOCKED';
      
      return {
        call_id: c.id,
        agent_id: c.agent,
        customer_id: c.customer,
        audio_url: 's3://mocked/audio.mp3', // mock
        duration_secs: parseInt(c.duration.split(':')[0]) * 60 + parseInt(c.duration.split(':')[1]),
        transcript: c.transcript,
        processing_status: 'COMPLETED',
        ai_result: {
          intent: c.topic,
          summary: c.summary,
          confidence: c.confidence,
          sentiment: c.sentiment.toUpperCase()
        },
        governance_result: {
          status: mappedStatus,
          governance_score: c.confidence, // mock map
          flags: c.flags,
          masked_transcript: c.transcript
        }
      };
    });

    await CallLog.insertMany(callLogsToInsert);

    console.log('Seeding DeliveryOrders...');
    const ordersToInsert = mockDeliveryOrders.map(o => {
      // mapped statuses: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, FAILED
      let status = 'PENDING';
      if (o.status === 'in-transit') status = 'SHIPPED';
      if (o.status === 'delivered') status = 'DELIVERED';
      if (o.status === 'cancelled') status = 'CANCELLED';

      return {
        order_id: o.id,
        call_id: o.callRef,
        customer_id: o.customer,
        items: o.items,
        notes: `${o.carrier} - ${o.value}`, // stash mock data in notes for extraction
        status: status,
        flagged: o.status === 'flagged',
        history: [{ status: status, changed_by: 'SEEDER', note: 'Initial Seed' }]
      };
    });

    await DeliveryOrder.insertMany(ordersToInsert);

    console.log('Successfully seeded CallLogs and DeliveryOrders!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
