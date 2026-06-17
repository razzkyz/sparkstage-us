import { DEFAULT_EVENT_PAGE_SETTINGS, useEventSettings } from '../hooks/useEventSettings';
import { getCmsFontStyle } from '../lib/cmsTypography';
import { AppLoadingScreen } from '../app/AppLoadingScreen';

const Events = () => {
  const { settings, isLoading: settingsLoading } = useEventSettings();

  if (settingsLoading) {
    return <AppLoadingScreen />;
  }

  const content = settings ?? DEFAULT_EVENT_PAGE_SETTINGS;
  // const heroImages = content.hero_images.filter(Boolean);
  const magicTitle = content.magic_title;
  const magicDesc = content.magic_description;
  const magicBtnText = content.magic_button_text;
  const magicBtnLink = content.magic_button_link;
  const magicImages = content.magic_images.filter(Boolean);
  const expTitle = content.experience_title;
  const expImages = content.experience_images.filter(Boolean);
  const expLinks = content.experience_links;
  const magicFonts = content.section_fonts.magic;
  const experienceFonts = content.section_fonts.experience;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/50 to-pink-100/20 text-gray-900 selection:bg-pink-200/30">
      
      {/* 1. Hero Gallery Row (Dynamic Layout) */}
      {/* Nonaktifkan sementara*/}
      {/* <section className="flex h-[42vh] w-full snap-x snap-mandatory overflow-x-auto hide-scrollbar sm:h-[50vh] md:h-[65vh]">
        {heroImages.map((img, idx) => (
          <div 
            key={idx} 
            className="flex-none h-full border-r border-[#fcfcf9]/20 last:border-0 relative group snap-start bg-gray-100"
            style={{ width: `${100 / Math.min(5, Math.max(1, heroImages.length))}vw` }}
          >
            <img 
              src={img} 
              alt={`Gallery ${idx + 1}`} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              onError={(e) => { 
                // Hide completely or replace with a placeholder if it breaks
                e.currentTarget.style.display = 'none'; 
              }}
            />
          </div>
        ))}
      </section> */}

      <main className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 lg:px-8 md:pt-32 md:pb-12">
        
        {/* 2. Capturing Magic Moment Section */}
        <section className="mb-20 grid grid-cols-[minmax(0,1.2fr)_minmax(7rem,0.8fr)] items-start gap-4 sm:mb-32 sm:flex sm:items-center sm:gap-12 md:gap-24">
          <div className="min-w-0 flex-1 max-w-xl">
            <h1 
              className="mb-4 text-[2rem] leading-none text-gray-900 font-black whitespace-pre-line sm:mb-8 sm:text-6xl lg:text-7xl"
              style={getCmsFontStyle(magicFonts.heading)}
            >
              {magicTitle.toLowerCase() === 'every moment deserves to spark' ? 'Every moment\ndeserves to Spark' : magicTitle}
            </h1>
            <p className="mb-5 text-[11px] leading-relaxed font-light text-gray-500 sm:mb-10 sm:text-base" style={getCmsFontStyle(magicFonts.body)}>
              {magicDesc}
            </p>
            {magicBtnText && (
              <a 
                href={magicBtnLink} 
                className="inline-block px-8 py-4 bg-gradient-to-r from-pink-600 via-pink-500 to-rose-500 text-white font-black rounded-full shadow-xl shadow-pink-300 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-xs sm:text-sm uppercase tracking-widest"
                style={getCmsFontStyle(magicFonts.body)}
              >
                {magicBtnText}
              </a>
            )}
          </div>
          
          <div className="flex justify-end sm:flex-1">
            <div className="relative aspect-[3/4] w-full max-w-[8.5rem] sm:max-w-md">
              {magicImages[0] && (
                <img 
                  src={magicImages[0]} 
                  alt="Magic moment text accompanying image" 
                  className="w-full h-full object-cover rounded-3xl shadow-2xl shadow-pink-200 border-2 border-pink-300"
                />
              )}
            </div>
          </div>
        </section>

        {/* 3. Image Collage (3 images side by side layout) */}
        <section className="mb-20 sm:mb-32">
          <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-6 md:gap-8">
            {expImages.map((img, idx) => {
              // Create an interesting staggered layout like the sketch
              const heights = ['aspect-square', 'aspect-[3/4]', 'aspect-[4/5]'];
              const margins = ['mb-0', 'mb-6 sm:mb-12', 'mb-0'];
              
              return (
                <div key={idx} className={`w-full ${margins[idx % 3]}`}>
                  <img 
                    src={img} 
                    alt={`Experience ${idx + 1}`} 
                    className={`w-full object-cover ${heights[idx % 3]} rounded-2xl shadow-xl shadow-pink-200 border-2 border-pink-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Choose Your Experience Links */}
        <section className="mb-12 text-center sm:mb-12">
          <h2 className="mb-10 text-2xl text-gray-900 font-black sm:mb-16 sm:text-3xl md:text-4xl" style={getCmsFontStyle(experienceFonts.heading)}>
            {expTitle.split(' ').map((word, i) => {
              const isItalic = word.toLowerCase() === 'your';
              return (
                <span key={i} className={isItalic ? 'italic font-light' : 'font-black'}>
                  {word}{' '}
                </span>
              );
            })}
          </h2>
          
          <div className="flex items-stretch justify-center gap-6 md:gap-12">
            {expLinks.map((link, idx) => (
              <a 
                href={link.link || '#'} 
                key={idx}
                className="group min-w-0 flex-1 px-6 py-4 text-center bg-gradient-to-br from-white to-pink-50 border-2 border-pink-300 rounded-3xl hover:border-pink-500 hover:shadow-2xl hover:shadow-pink-200 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="mb-2 text-lg text-gray-900 font-black sm:mb-4 sm:text-2xl" style={getCmsFontStyle(experienceFonts.heading)}>{link.title}</div>
                <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-pink-700 sm:text-[10px] sm:tracking-[0.2em]" style={getCmsFontStyle(experienceFonts.body)}>{link.subtitle}</div>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Events;
