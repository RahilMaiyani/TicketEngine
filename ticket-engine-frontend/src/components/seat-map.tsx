import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Clock, ShieldCheck, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

interface Seat {
    id: string;
    seatNumber: string;
    row: string;
    number: number;
    price: string;
    status: 'AVAILABLE' | "HELD" | "CONFIRMED";
}

const EVENT_ID = 'dfdb4375-b739-47ee-940e-ae26997a85b8';
const API_URL = "http://localhost:3000";

export default function SeatMap() {
    const queryClient = useQueryClient();
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [activeReservation, setActiveReservation] = useState<{
        id: string;
        seatNumber: string;
        expiresAt: string;
    } | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
    const [orderConfirmed, setOrderConfirmed] = useState<any>(null);

    const { data: seats = [], isLoading } = useQuery<Seat[]>({
        queryKey: ['seats', EVENT_ID],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/events/${EVENT_ID}/seats`);
            if (!res.ok) throw new Error('Failed to fetch data');
            return res.json();
        },
    });

    useEffect(() => {
        const sse = new EventSource(`${API_URL}/events/${EVENT_ID}/seats/stream`);

        sse.onmessage = (event) => {
            try {
                const delta = JSON.parse(event.data);
                console.log("[SSE Delta Recieved]:", delta);

                queryClient.setQueryData<Seat[]>(['seats', EVENT_ID], (oldSeats) => {
                    if (!oldSeats) return [];
                    return oldSeats.map((seat) =>
                        seat.seatNumber === delta.seatNumber
                            ? { ...seat, status: delta.status }
                            : seat
                    );
                });

                if (delta.seatNumber === activeReservation?.seatNumber && delta.status === 'AVAILABLE') {
                    setActiveReservation(null);
                    setSelectedSeat(null);
                }
            }
            catch (err) {
                console.error("Error parsing SSE event", err);
            }
        }

        sse.onerror = (err) => {
            console.warn("SSE connection inerrupted, browser will auto-reconnect...", err);
        }

        return () => {
            sse.close();
        };
    }, [queryClient, activeReservation]);

    useEffect(() => {
        if (!activeReservation) return;

        const interval = setInterval(() => {
            const remainingSeconds = Math.max(
                0,
                Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000),
            );
            setTimeLeft(remainingSeconds);

            if (remainingSeconds <= 0) {
                setActiveReservation(null);
                setSelectedSeat(null);
                alert("Your 10-minute hold has expires!@ The seat has been returned to the pool.");
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeReservation]);

    const handleHoldSeat = async (seat: Seat) => {
        if (seat.status !== 'AVAILABLE') return;
        if (activeReservation) {
            alert("You already have a seat held in your cart!");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/reservations/hold`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: EVENT_ID,
                    seatNumber: seat.seatNumber,
                    userId: `web_user_${Math.floor(Math.random() * 10000)}`,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || 'Could not hold seat');
                return;
            }

            setSelectedSeat(seat);
            setActiveReservation({
                id: data.resevationId,
                seatNumber: data.seatNumber,
                expiresAt: data.expiresAt,
            });
        }
        catch (e) {
            alert("Network error while holding seat");
        }

    }

    const handleCheckout = async () => {
        if (!activeReservation || !selectedSeat) return;
        setIsCheckingOut(true);

        const idempotencyKey = `web-checkout-${activeReservation.id}`;

        try {
            const res = await fetch(`${API_URL}/orders/checkout`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Idenmpotency-Key': idempotencyKey,
                },
                body: JSON.stringify({
                    reservationId: activeReservation.id,
                    amount: Number(selectedSeat.price),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Checkout failed");
                return;
            }

            setOrderConfirmed(data);
            setActiveReservation(null);
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
        catch (e) {
            alert("Checkout error")
        }
        finally {
            setIsCheckingOut(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center text-slate-400">Loading theater map...</div>
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                    Grand Symphony Concert
                </h1>
                <p className="text-slate-400 mt-2">
                    High-Concurrency Live Seat Map with Real-Time SSE Updates
                </p>
            </div>
            {/* Screen / Stage Visualization */}
            <div className="relative mb-12">
                <div className="w-3/4 mx-auto h-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full shadow-[0_0_25px_rgba(99,102,241,0.5)]" />
                <p className="text-center text-xs tracking-widest text-slate-500 uppercase mt-2">
                    STAGE / PERFORMANCE HALL
                </p>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-6 mb-8 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500/80" />
                    <span className="text-slate-300">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500 animate-pulse" />
                    <span className="text-slate-300">Held (10m Cart)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700" />
                    <span className="text-slate-500">Sold</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-indigo-600 ring-2 ring-indigo-400" />
                    <span className="text-indigo-300 font-medium">Your Selection</span>
                </div>
            </div>
            {/* Theater Grid */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center gap-3">
                {rows.map((row) => (
                    <div key={row} className="flex items-center gap-2">
                        <span className="w-6 text-xs font-bold text-slate-500 text-center">{row}</span>
                        <div className="flex gap-2">
                            {seats
                                .filter((s) => s.row === row)
                                .map((seat) => {
                                    const isMyHold = activeReservation?.seatNumber === seat.seatNumber;
                                    const isHeldByOther = seat.status === 'HELD' && !isMyHold;
                                    const isSold = seat.status === 'CONFIRMED';
                                    const isAvailable = seat.status === 'AVAILABLE';
                                    return (
                                        <button
                                            key={seat.id}
                                            onClick={() => handleHoldSeat(seat)}
                                            disabled={!isAvailable}
                                            className={`
                        w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center
                        ${isMyHold
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.6)]'
                                                    : isHeldByOther
                                                        ? 'bg-amber-500/80 text-black cursor-not-allowed animate-pulse'
                                                        : isSold
                                                            ? 'bg-slate-800/60 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white cursor-pointer active:scale-95'
                                                }
                      `}
                                            title={`Seat ${seat.seatNumber} - $${seat.price}`}
                                        >
                                            {seat.number}
                                        </button>
                                    );
                                })}
                        </div>
                        <span className="w-6 text-xs font-bold text-slate-500 text-center">{row}</span>
                    </div>
                ))}
            </div>
            {/* Active Reservation Drawer / Checkout Banner */}
            {activeReservation && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
                    <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                                <Ticket className="w-4 h-4" />
                                Seat {activeReservation.seatNumber} Reserved
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                Hold expires in: {Math.floor(timeLeft / 60)}:
                                {(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-white">${selectedSeat?.price}</span>
                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {isCheckingOut ? 'Confirming...' : 'Pay & Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Order Confirmed Modal */}
            {orderConfirmed && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Ticket Confirmed!</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Your reservation has been permanently written to PostgreSQL.
                        </p>
                        <div className="bg-slate-950 p-4 rounded-xl my-4 text-left text-xs font-mono space-y-1.5 border border-slate-800">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Order ID:</span>
                                <span className="text-slate-300 truncate max-w-[200px]">{orderConfirmed.orderId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Seat Number:</span>
                                <span className="text-emerald-400 font-bold">{orderConfirmed.seatNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Amount Paid:</span>
                                <span className="text-white">${orderConfirmed.amount}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setOrderConfirmed(null)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}