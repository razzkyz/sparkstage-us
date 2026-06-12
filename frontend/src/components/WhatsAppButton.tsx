const WHATSAPP_LINK = 'https://wa.me/6281558200089';

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 transition-all hover:scale-110"
      aria-label="Chat Customer Service"
    >
      <img
        src="/images/icon.png"
        alt="Customer Service"
        className="w-16 h-16 md:w-20 md:h-20 rounded-full shadow-xl object-cover"
      />
    </a>
  );
}