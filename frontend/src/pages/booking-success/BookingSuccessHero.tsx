type BookingSuccessHeroProps = {
  effectiveStatus: string | null;
  statusIcon: string;
  statusTitle: string;
  statusDescription: string;
  isInitialPending?: boolean;
};

export function BookingSuccessHero(props: BookingSuccessHeroProps) {
  const { effectiveStatus, statusIcon, statusTitle, statusDescription, isInitialPending } = props;

  // Show immediate payment success on initial page load
  const showPaymentSuccess = isInitialPending && effectiveStatus === 'pending';

  return (
    <div className="text-center mb-8">
      {effectiveStatus === 'paid' || showPaymentSuccess ? (
        <>
          <p className="text-xs uppercase tracking-widest text-green-600 font-semibold mb-3">
            {showPaymentSuccess ? 'Payment Successful' : 'Booking Confirmed'}
          </p>
          <div className="flex justify-center mb-2">
            <img
              src="/images/landing/READY%20TO%20BE%20A%20STAR.PNG"
              alt="Ready to Be a Star?"
              className="h-auto w-full max-w-xl object-contain"
            />
          </div>
          {showPaymentSuccess && (
            <p className="text-[#9c4949] text-sm font-normal mt-4">
              Your tickets are being generated. You'll see them here momentarily.
            </p>
          )}
        </>
      ) : (
        <>
          <div
            className={`inline-flex items-center justify-center p-3 mb-4 rounded-full ${
              effectiveStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-primary/10 text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-4xl">{statusIcon}</span>
          </div>
          <h1 className="text-[#1c0d0d] tracking-tight text-4xl md:text-5xl font-bold leading-tight pb-3 font-display">
            {statusTitle}
          </h1>
          <p className="text-[#9c4949] text-lg font-normal leading-normal max-w-xl mx-auto px-4">{statusDescription}</p>
        </>
      )}
    </div>
  );
}
