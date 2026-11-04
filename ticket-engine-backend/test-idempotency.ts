import 'dotenv/config';

async function testIdempotency() {
    const eventId = 'e2a96b34-bb49-4a4c-8997-5ab5dece6b0a'; // Your seeded event ID
    const seatNumber = 'A3';
    const userId = 'user_charlie';
    const idempotencyKey = `idemp-${Date.now()}`;

    console.log('1. Holding Seat B1...');
    const holdRes = await fetch('http://localhost:3000/reservations/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, seatNumber, userId }),
    });
    const holdData = await holdRes.json();
    console.log('Hold response:', holdData);

    if (!holdData.reservationId) {
        console.error('Failed to hold seat, cannot test checkout.');
        return;
    }

    console.log('\n2. Firing 2 DUPLICATE Checkout requests simultaneously with identical Idempotency-Key...\n');

    const payload = {
        reservationId: holdData.reservationId,
        amount: 150.0,
    };

    const [req1, req2] = await Promise.all([
        fetch('http://localhost:3000/orders/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(payload),
        }),
        fetch('http://localhost:3000/orders/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(payload),
        }),
    ]);

    const res1 = await req1.json();
    const res2 = await req2.json();

    console.log('Response 1 status:', req1.status, res1);
    console.log('Response 2 status:', req2.status, res2);

    console.log('\n3. Third test: Sending the exact same request 2 seconds later (Network Retry)...');
    const req3 = await fetch('http://localhost:3000/orders/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
    });
    const res3 = await req3.json();
    console.log('Response 3 (Replayed Cached Response):', req3.status, res3);

    if (res1.orderId && res3.orderId && res1.orderId === res3.orderId) {
        console.log('\n🏆 IDEMPOTENCY PASSED: Identical order returned without duplicate processing!\n');
    }
}

testIdempotency();