import 'dotenv/config';

async function testSSE() {
    const eventId = 'e2a96b34-bb49-4a4c-8997-5ab5dece6b0a';
    const sseUrl = `http://localhost:3000/events/${eventId}/seats/stream`;

    console.log(`Connecting to live SSE Stream: ${sseUrl} ...`);

    const response = await fetch(sseUrl);
    if (!response.body) {
        console.error('No response body received from SSE endpoint.');
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    (async () => {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            console.log('[SSE Message Received]:\n', text.trim());
        }
    })();

    console.log('Connected! Waiting 2 seconds, then holding Seat C5 to trigger an event...\n');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await fetch('http://localhost:3000/reservations/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventId,
            seatNumber: 'C5',
            userId: 'sse_listener_test',
        }),
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('\n✅ SSE verification complete.');
    process.exit(0);
}

testSSE();