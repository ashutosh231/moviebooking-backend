import fs from 'fs';
import { bookingConfirmationTemplate } from './config/emailTemplates.js';

const mockBooking = {
  _id: "69b6f31a7e104ca10e5fcf72",
  movie: {
    title: "Smiles",
    poster: "https://res.cloudinary.com/dzq7vqiie/image/upload/v1742051644/movie_posters/rsqryu3szfxt35q1ex6h.jpg"
  },
  showtime: new Date("2025-04-12T19:00:00Z"),
  auditorium: "Audi 3",
  seats: [
    { id: "C4", type: "Standard" },
    { id: "C5", type: "Standard" }
  ],
  amountPaise: 50000,
  paymentIntentId: "pay_xyz123ab",
  currency: "INR"
};

const html = bookingConfirmationTemplate({ name: "Santosh", booking: mockBooking });
fs.writeFileSync('/tmp/booking_email_test.html', html);
console.log("Mock email written to /tmp/booking_email_test.html");
