import { Rocket, Sparkles, Zap, ShieldCheck, QrCode, MessageCircle, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NovidadesPage() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setNews(data);
      setLoading(false);
    };
    fetchNews();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles className="w-5 h-5 text-primary" />;
      case 'fix': return <Zap className="w-5 h-5 text-amber-500" />;
      default: return <Rocket className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Novidades</h1>
          <p className="text-muted-foreground">Acompanhe as atualizações e melhorias do Gerador de Atas AVIVA.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground italic">Nenhuma novidade publicada ainda.</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-[2px] before:bg-primary/10">
          {news.map((item) => (
            <div key={item.id} className="relative pl-12 group">
              <div className="absolute left-0 top-0 w-[44px] h-[44px] rounded-2xl bg-white border-2 border-primary/20 flex items-center justify-center z-10 group-hover:scale-110 transition-transform shadow-sm">
                {getIcon(item.type)}
              </div>
              
              <div className="section-card hover:border-primary/30 transition-all border-primary/10 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-md bg-primary text-white text-[10px] font-black tracking-widest uppercase">
                      v{item.version || '1.0.0'}
                    </span>
                    <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                    {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {item.description}
                </p>

                {item.author_credit && (
                  <div className="flex items-center gap-2 pt-4 border-t border-dashed">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <p className="text-xs font-bold text-foreground">
                      Sugestão enviada por: <span className="text-primary italic">{item.author_credit}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 text-center space-y-4">
        <h3 className="text-xl font-bold">O sistema está em constante evolução!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Muitas dessas funcionalidades foram sugeridas pelos próprios secretários. 
          Use o botão de **Ajuda** para enviar sua ideia e vê-la aqui em breve!
        </p>
      </div>
    </div>
  );
}
