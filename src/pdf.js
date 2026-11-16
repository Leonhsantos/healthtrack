const PDFDocument = require('pdfkit');
const { fmtData } = require('./util');

const ALIM = { seguiu: 'Seguiu o planejamento', parcial: 'Seguiu parcialmente', nao_seguiu: 'Não seguiu' };

// Relatório periódico em PDF (RF07): período, treinos, alimentação, observações e histórico diário
function gerarPdf(res, rel, alunoNome, regs) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="relatorio-${rel.id}.pdf"`);
  doc.pipe(res);

  const titulo = (t) => doc.moveDown(1).font('Helvetica-Bold').fontSize(13).text(t).moveDown(0.3).font('Helvetica').fontSize(11);

  doc.font('Helvetica-Bold').fontSize(20).text('Relatório de hábitos - HealthTrack');
  doc.moveDown(0.4).font('Helvetica').fontSize(11);
  doc.text(`Aluno: ${alunoNome}`);
  doc.text(`Período: ${fmtData(rel.periodo_inicio)} a ${fmtData(rel.periodo_fim)}`);
  doc.text(`Gerado em: ${new Date(rel.gerado_em).toLocaleString('pt-BR')}`);

  const parcial = regs.filter((r) => r.alimentacao === 'parcial').length;
  const minutos = regs.reduce((s, r) => s + (r.duracao_minutos || 0), 0);
  titulo('Indicadores');
  doc.text(`Treinos realizados: ${rel.treinos}`);
  doc.text(`Dias registrados: ${rel.dias_registrados}`);
  doc.text(`Dias seguindo o planejamento: ${rel.dias_seguindo_plano}`);
  doc.text(`Dias seguindo parcialmente: ${parcial}`);
  doc.text(`Tempo total de treino: ${Math.floor(minutos / 60)} h ${minutos % 60} min`);

  titulo('Observações registradas');
  const comObs = regs.filter((r) => r.observacao);
  if (!comObs.length) doc.text('Nenhuma observação no período.');
  [...comObs].reverse().forEach((r) => doc.text(`${fmtData(r.data)}: ${r.observacao}`).moveDown(0.2));

  titulo('Histórico diário');
  [...regs].reverse().forEach((r) => {
    const treino = r.academia ? `Academia: sim (${r.duracao_minutos} min)` : 'Academia: não';
    doc.text(`${fmtData(r.data)}  |  ${treino}  |  Alimentação: ${ALIM[r.alimentacao]}`);
  });

  doc.moveDown(2).fontSize(9).fillColor('#555').text(
    'Este relatório organiza informações registradas pelo próprio usuário. Não substitui avaliação, diagnóstico ou orientação de profissionais de saúde.'
  );
  doc.end();
}

module.exports = { gerarPdf };
