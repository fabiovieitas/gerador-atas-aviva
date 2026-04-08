export function AjudaPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ajuda Rápida</h1>
        <p className="text-sm text-muted-foreground mt-1">Guia simples para usar o sistema sem erro.</p>
      </div>

      <div className="section-card space-y-3">
        <h2 className="section-title">Passo a passo</h2>
        <ol className="list-decimal pl-4 text-sm text-muted-foreground space-y-2">
          <li>Cadastre os membros na tela "Membros".</li>
          <li>Vá em "Nova Ata", preencha os campos e confirme a presença.</li>
          <li>Clique em "Gerar Ata" para criar o texto.</li>
          <li>Revise no editor e clique em "Word" para baixar.</li>
        </ol>
      </div>

      <div className="section-card space-y-3">
        <h2 className="section-title">Dúvidas comuns</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Perdi um dado. E agora?</strong> Use a tela "Configurações" para restaurar um backup.</p>
          <p><strong>Importação deu erro.</strong> Baixe o modelo CSV na tela "Membros" e preencha no mesmo formato.</p>
          <p><strong>Não encontro uma ata.</strong> Use a busca na tela "Histórico".</p>
        </div>
      </div>
    </div>
  );
}
