import { PageTransition } from "../components/PageTransition";
import { useNewsSettings } from "../hooks/useNewsSettings";

export default function News() {
  const { settings, isLoading } = useNewsSettings();

  if (isLoading || !settings) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        {settings.section_order.map((sectionId, index) => {
          const isEven = index % 2 === 0;
          const bgClass = isEven ? 'bg-white' : 'bg-gray-50';

          if (sectionId === 'section_1') {
            return (
              <section key={sectionId} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className={isEven ? '' : 'order-1 lg:order-2'}>
                      <span className="inline-block px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest mb-6">
                        {settings.section_1_category}
                      </span>
                      <h1
                        className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight"
                        style={{ fontFamily: settings.section_fonts.section_1?.heading || "serif" }}
                      >
                        {settings.section_1_title}
                      </h1>
                      <p className="text-xl text-gray-600 mb-4">{settings.section_1_excerpt}</p>
                      <p className="text-gray-500 leading-relaxed whitespace-pre-line">{settings.section_1_description}</p>
                      <p className="text-sm text-gray-400 mt-4 italic">{settings.section_1_author}</p>
                    </div>
                    {settings.section_1_image && (
                      <div className={`bg-gray-100 rounded-2xl overflow-hidden ${isEven ? '' : 'order-2 lg:order-1'}`}>
                        <img
                          src={settings.section_1_image}
                          alt={settings.section_1_title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          if (sectionId === 'section_2') {
            return (
              <section key={sectionId} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {settings.section_2_image && (
                      <div className={`bg-gray-100 rounded-2xl overflow-hidden ${isEven ? 'order-2 lg:order-1' : ''}`}>
                        <img
                          src={settings.section_2_image}
                          alt={settings.section_2_title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                    <div className={isEven ? 'order-1 lg:order-2' : ''}>
                      <h2
                        className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight whitespace-pre-line"
                        style={{ fontFamily: settings.section_fonts.section_2?.heading || "serif" }}
                      >
                        {settings.section_2_title}
                      </h2>
                      <p className="text-2xl text-gray-700 mb-2">{settings.section_2_subtitle1}</p>
                      <p className="text-xl text-gray-500 mb-6">{settings.section_2_subtitle2}</p>
                      <blockquote className="border-l-4 border-black pl-6 py-4">
                        <p className="text-lg text-gray-900 italic whitespace-pre-line">{settings.section_2_quotes}</p>
                      </blockquote>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (sectionId === 'section_3') {
            return (
              <section key={sectionId} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <h2
                    className="text-3xl md:text-4xl font-black text-gray-900 mb-12 text-center"
                    style={{ fontFamily: settings.section_fonts.section_3?.heading || "serif" }}
                  >
                    {settings.section_3_title}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {settings.section_3_products.map((product, pIndex) => (
                      <div key={pIndex} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
                        {product.image && (
                          <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
                            <img src={product.image} alt={product.name} className="w-full h-auto object-contain" />
                          </div>
                        )}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{product.brand}</p>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                        <p className="text-gray-600 mb-4">{product.price}</p>
                        {product.link && (
                          <a href={product.link} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-colors">
                            Shop Now
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // Handle extra sections
          const section = settings.extra_sections.find(s => s.id === sectionId);
          if (!section) return null;

          if (section.type === 'article') {
            return (
              <section key={section.id} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className={isEven ? '' : 'order-1 lg:order-2'}>
                      {section.category && (
                        <span className="inline-block px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest mb-6">
                          {section.category}
                        </span>
                      )}
                      <h1
                        className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight"
                        style={{ fontFamily: 'serif' }}
                      >
                        {section.title}
                      </h1>
                      {section.excerpt && (
                        <p className="text-xl text-gray-600 mb-4">{section.excerpt}</p>
                      )}
                      {section.description && (
                        <p className="text-gray-500 leading-relaxed whitespace-pre-line">{section.description}</p>
                      )}
                      {section.author && (
                        <p className="text-sm text-gray-400 mt-4 italic">{section.author}</p>
                      )}
                    </div>
                    {section.image && (
                      <div className={`bg-gray-100 rounded-2xl overflow-hidden ${isEven ? '' : 'order-2 lg:order-1'}`}>
                        <img
                          src={section.image}
                          alt={section.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'quote') {
            return (
              <section key={section.id} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {section.image && (
                      <div className={`bg-gray-100 rounded-2xl overflow-hidden ${isEven ? 'order-2 lg:order-1' : ''}`}>
                        <img
                          src={section.image}
                          alt={section.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                    <div className={isEven ? 'order-1 lg:order-2' : ''}>
                      <h2
                        className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight whitespace-pre-line"
                        style={{ fontFamily: 'serif' }}
                      >
                        {section.title}
                      </h2>
                      {section.subtitle1 && (
                        <p className="text-2xl text-gray-700 mb-2">{section.subtitle1}</p>
                      )}
                      {section.subtitle2 && (
                        <p className="text-xl text-gray-500 mb-6">{section.subtitle2}</p>
                      )}
                      {section.quotes && (
                        <blockquote className="border-l-4 border-black pl-6 py-4">
                          <p className="text-lg text-gray-900 italic whitespace-pre-line">{section.quotes}</p>
                        </blockquote>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'products') {
            return (
              <section key={section.id} className={`py-20 px-6 md:px-12 lg:px-20 ${bgClass}`}>
                <div className="max-w-7xl mx-auto">
                  <h2
                    className="text-3xl md:text-4xl font-black text-gray-900 mb-12 text-center"
                    style={{ fontFamily: 'serif' }}
                  >
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(section.products || []).map((product, pIndex) => (
                      <div key={pIndex} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
                        {product.image && (
                          <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
                            <img src={product.image} alt={product.name} className="w-full h-auto object-contain" />
                          </div>
                        )}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{product.brand}</p>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                        {product.price && (
                          <p className="text-gray-600 mb-4">{product.price}</p>
                        )}
                        {product.link && (
                          <a href={product.link} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-colors">
                            Shop Now
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>
    </PageTransition>
  );
}
