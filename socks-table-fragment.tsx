        {/* ── Socks Table ──────────────────────────────────────── */}
        {tab === 'socks' && (
          <>
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-indigo-700">
                Total Hari: <strong>{sockStats.orders}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-indigo-700">
                Total Terjual: <strong>{sockStats.quantity} pasang</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-indigo-700">
                Revenue: <strong>{formatRupiah(sockStats.revenue)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'Tanggal', 'Stok Awal', 'Terjual', 'Sisa', 'Harga/Pasang', 'Total', 'Catatan'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {socksLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : sockPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada data kaos kaki di periode ini
                      </td>
                    </tr>
                  ) : (
                    sockPagination.data.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{sockPagination.start + i + 1}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatDate(s.report_date)}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{s.stock_awal}</td>
                        <td className="px-4 py-3 text-gray-700 font-bold text-right text-green-600">{s.terjual}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{s.sisa}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(s.harga_per_pasang)}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatRupiah(s.total)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.catatan ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && sockPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{sockPagination.start + 1}–{Math.min(sockPagination.start + ITEMS_PER_PAGE, sockPagination.total)}</strong> dari <strong>{sockPagination.total}</strong> hari
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(sockStats.revenue)}</span>
                </div>
                
                {sockPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSockPage(p => Math.max(1, p - 1))}
                      disabled={sockPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: sockPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setSockPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              sockPagination.page === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setSockPage(p => Math.min(sockPagination.totalPages, p + 1))}
                      disabled={sockPagination.page === sockPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
