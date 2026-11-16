(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
  const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const hoje = () => iso(new Date());
  const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const horas = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

  const ALIM = { seguiu: 'Segui o planejamento', parcial: 'Segui parcialmente', nao_seguiu: 'Não segui' };
  const ABAS_ALUNO = [['registro', 'Registro'], ['painel', 'Painel'], ['relatorios', 'Relatórios'], ['profissionais', 'Profissionais']];
  const ABAS_PROF = [['alunos', 'Alunos'], ['recebidos', 'Relatórios recebidos']];

  let token = localStorage.getItem('ht_token');
  let user = JSON.parse(localStorage.getItem('ht_user') || 'null');
  let aba = null;
  let modoAuth = 'login';

  function aviso(msg, erro = false) {
    const el = $('#aviso');
    el.textContent = msg;
    el.className = 'visivel' + (erro ? ' erro' : '');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => (el.className = ''), 4000);
  }

  async function api(url, opts = {}) {
    const res = await fetch('/api' + url, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const dados = await res.json().catch(() => ({}));
    if (res.status === 401 && token) { sair(); throw new Error('Sua sessão expirou. Entre novamente.'); }
    if (!res.ok) throw new Error(dados.erro || 'Não foi possível concluir a ação');
    return dados;
  }

  async function baixarPdf(id) {
    const res = await fetch(`/api/relatorios/${id}/pdf`, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.erro || 'Não foi possível abrir o PDF'); }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = `relatorio-${id}.pdf`;
    a.click();
  }

  function sair() {
    token = null; user = null;
    localStorage.removeItem('ht_token'); localStorage.removeItem('ht_user');
    render();
  }

  /* ---------- Entrada ---------- */
  function telaAuth() {
    const cad = modoAuth === 'cadastro';
    app.innerHTML = `<main class="auth"><div class="auth-box">
      <h1>HealthTrack</h1>
      <p class="sub">Registre sua rotina de treino e alimentação e compartilhe o histórico com quem acompanha você.</p>
      <div class="tabs">
        <button type="button" class="${cad ? '' : 'ativa'}" data-modo="login">Entrar</button>
        <button type="button" class="${cad ? 'ativa' : ''}" data-modo="cadastro">Criar conta</button>
      </div>
      <form id="f-auth">
        ${cad ? '<label>Nome<input name="nome" required maxlength="120" autocomplete="name"></label>' : ''}
        <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
        <label>Senha<input name="senha" type="password" required minlength="6" autocomplete="${cad ? 'new-password' : 'current-password'}"></label>
        ${cad ? `<label>Tipo de conta
            <select name="tipo"><option value="aluno">Aluno</option><option value="profissional">Profissional (instrutor, nutricionista)</option></select></label>
          <label id="l-esp" hidden>Especialidade<input name="especialidade" maxlength="60" placeholder="Ex.: Nutrição"></label>` : ''}
        <button class="primario" type="submit">${cad ? 'Criar conta' : 'Entrar'}</button>
      </form></div></main>`;

    app.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { modoAuth = b.dataset.modo; telaAuth(); }));
    const f = $('#f-auth');
    if (cad) f.tipo.addEventListener('change', () => {
      const prof = f.tipo.value === 'profissional';
      $('#l-esp').hidden = !prof;
      f.especialidade.required = prof;
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const body = Object.fromEntries(new FormData(f));
        const r = await api(cad ? '/auth/cadastro' : '/auth/login', { method: 'POST', body });
        token = r.token; user = r.usuario;
        localStorage.setItem('ht_token', token); localStorage.setItem('ht_user', JSON.stringify(user));
        aba = null;
        render();
      } catch (err) { aviso(err.message, true); }
    });
  }

  /* ---------- Estrutura do app ---------- */
  function telaApp() {
    const abas = user.tipo === 'aluno' ? ABAS_ALUNO : ABAS_PROF;
    if (!abas.some((a) => a[0] === aba)) aba = abas[0][0];
    app.innerHTML = `<header class="topo">
        <strong class="marca">HealthTrack</strong>
        <nav>${abas.map(([id, nome]) => `<button type="button" class="${id === aba ? 'ativa' : ''}" data-aba="${id}">${nome}</button>`).join('')}</nav>
        <div class="quem">${esc(user.nome)} <button type="button" class="link" id="sair">Sair</button></div>
      </header><main id="view"></main>`;
    app.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { aba = b.dataset.aba; telaApp(); }));
    $('#sair').addEventListener('click', sair);
    carregarView();
  }

  async function carregarView() {
    // Troca o elemento para descartar os ouvintes de eventos da tela anterior
    const antigo = $('#view');
    const view = antigo.cloneNode(false);
    antigo.replaceWith(view);
    view.innerHTML = '<p class="carregando">Carregando…</p>';
    try { await VIEWS[aba](view); }
    catch (e) { view.innerHTML = `<p class="erro-caixa">${esc(e.message)}</p>`; }
  }

  /* ---------- Componentes ---------- */
  function tabelaRegistros(lista, editavel) {
    if (!lista.length) return '<p class="vazio">Nenhum registro neste período.</p>';
    return `<div class="tabela"><table><thead><tr><th>Data</th><th>Academia</th><th>Alimentação</th><th>Observação</th>${editavel ? '<th></th>' : ''}</tr></thead><tbody>
      ${lista.map((r) => `<tr><td>${fmt(r.data)}</td><td>${r.academia ? `Sim, ${r.duracao_minutos} min` : 'Não'}</td><td>${ALIM[r.alimentacao]}</td><td>${esc(r.observacao || '')}</td>
        ${editavel ? `<td><button type="button" data-editar="${r.id}">Editar</button></td>` : ''}</tr>`).join('')}
      </tbody></table></div>`;
  }

  function cartoes(d) {
    const n = (v, t) => `<div class="numero"><strong>${v}</strong><span>${t}</span></div>`;
    return `<div class="numeros">${n(d.treinos, 'treinos realizados')}${n(d.dias_registrados, 'dias registrados')}${n(d.dias_seguindo_plano, 'dias seguindo o planejamento')}${n(horas(d.minutos), 'de treino no período')}</div>`;
  }

  function graficoSemanas(sem) {
    if (!sem.length) return '<section class="card"><h2>Semana a semana</h2><p class="vazio">Sem registros neste período.</p></section>';
    const W = 640, H = 230, m = { t: 20, b: 36, l: 28, r: 8 };
    const max = Math.max(1, ...sem.map((s) => s.registros));
    const gw = (W - m.l - m.r) / sem.length, bw = Math.min(22, gw / 2.6);
    const y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
    const barras = sem.map((s, i) => {
      const cx = m.l + gw * i + gw / 2;
      return `<rect class="b-reg" x="${cx - bw - 1}" y="${y(s.registros)}" width="${bw}" height="${H - m.b - y(s.registros)}"/>
        <rect class="b-tre" x="${cx + 1}" y="${y(s.treinos)}" width="${bw}" height="${H - m.b - y(s.treinos)}"/>
        <text x="${cx - bw / 2 - 1}" y="${y(s.registros) - 4}" text-anchor="middle">${s.registros}</text>
        <text x="${cx + bw / 2 + 1}" y="${y(s.treinos) - 4}" text-anchor="middle">${s.treinos}</text>
        <text x="${cx}" y="${H - 14}" text-anchor="middle">${fmt(s.semana).slice(0, 5)}</text>`;
    }).join('');
    return `<section class="card"><h2>Semana a semana</h2>
      <div class="legenda"><span><i class="b-reg"></i>Dias registrados</span><span><i class="b-tre"></i>Treinos</span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dias registrados e treinos por semana">${barras}<line class="eixo" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/></svg>
      <p class="nota">Cada grupo de barras é uma semana; a data embaixo é a segunda-feira em que ela começa.</p></section>`;
  }

  // Painel com filtro de período. "buscar" devolve { dash, regs? }
  function painelComPeriodo(el, buscar) {
    el.innerHTML = `<form class="periodo card"><label>De<input type="date" name="inicio" value="${diasAtras(29)}"></label>
      <label>Até<input type="date" name="fim" value="${hoje()}"></label><button class="primario">Atualizar</button></form><div class="resultado"></div>`;
    const f = $('form', el), res = $('.resultado', el);
    const atualizar = async () => {
      res.innerHTML = '<p class="carregando">Carregando…</p>';
      try {
        const { dash, regs } = await buscar(f.inicio.value, f.fim.value);
        res.innerHTML = cartoes(dash) + graficoSemanas(dash.semanas) +
          (regs ? `<section class="card"><h2>Histórico diário</h2>${tabelaRegistros(regs, false)}</section>` : '');
      } catch (e) { res.innerHTML = `<p class="erro-caixa">${esc(e.message)}</p>`; }
    };
    f.addEventListener('submit', (ev) => { ev.preventDefault(); atualizar(); });
    atualizar();
  }

  /* ---------- Telas do aluno ---------- */
  const VIEWS = {};

  VIEWS.registro = async (el) => {
    const lista = await api(`/registros?inicio=${diasAtras(30)}&fim=${hoje()}`);
    let editId = null;
    el.innerHTML = `<div class="duas">
      <form id="f-reg" class="card"><h2 id="t-reg">Registrar o dia</h2>
        <label>Data<input type="date" name="data" required value="${hoje()}"></label>
        <label class="check"><input type="checkbox" name="academia"> Fui à academia</label>
        <label>Duração do treino (minutos)<input type="number" name="duracao" min="1" max="600" step="5" disabled></label>
        <label>Alimentação<select name="alimentacao" required><option value="">Escolha…</option>
          ${Object.entries(ALIM).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <label>Observação<textarea name="observacao" rows="3" maxlength="1000" placeholder="Como foi o dia? O que dificultou?"></textarea></label>
        <div class="acoes"><button class="primario" type="submit" id="b-reg">Salvar registro</button>
          <button type="button" id="b-cancel" hidden>Cancelar edição</button></div>
      </form>
      <section class="card"><h2>Últimos 30 dias</h2>${tabelaRegistros(lista, true)}</section></div>`;

    const f = $('#f-reg');
    const sincronizar = () => { f.duracao.disabled = !f.academia.checked; f.duracao.required = f.academia.checked; if (!f.academia.checked) f.duracao.value = ''; };
    f.academia.addEventListener('change', sincronizar);
    const limpar = () => { editId = null; f.reset(); f.data.value = hoje(); sincronizar(); $('#t-reg').textContent = 'Registrar o dia'; $('#b-reg').textContent = 'Salvar registro'; $('#b-cancel').hidden = true; };
    $('#b-cancel').addEventListener('click', limpar);

    el.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => {
      const r = lista.find((x) => String(x.id) === b.dataset.editar);
      editId = r.id;
      f.data.value = String(r.data).slice(0, 10);
      f.academia.checked = r.academia; sincronizar();
      f.duracao.value = r.duracao_minutos || '';
      f.alimentacao.value = r.alimentacao;
      f.observacao.value = r.observacao || '';
      $('#t-reg').textContent = 'Editar registro';
      $('#b-reg').textContent = 'Salvar alterações';
      $('#b-cancel').hidden = false;
      f.scrollIntoView({ behavior: 'smooth' });
    }));

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const academia = f.academia.checked;
      const body = { data: f.data.value, academia, duracao_minutos: academia ? Number(f.duracao.value) : null, alimentacao: f.alimentacao.value, observacao: f.observacao.value };
      try {
        await api(editId ? `/registros/${editId}` : '/registros', { method: editId ? 'PUT' : 'POST', body });
        aviso('Registro salvo.');
        carregarView();
      } catch (err) { aviso(err.message, true); }
    });
  };

  VIEWS.painel = async (el) => {
    painelComPeriodo(el, async (i, f) => ({ dash: await api(`/dashboard?inicio=${i}&fim=${f}`) }));
  };

  VIEWS.relatorios = async (el) => {
    const [rels, vins] = await Promise.all([api('/relatorios'), api('/vinculos')]);
    const aut = vins.filter((v) => v.status === 'autorizado');
    el.innerHTML = `<form id="f-rel" class="periodo card"><label>De<input type="date" name="inicio" value="${diasAtras(29)}" required></label>
      <label>Até<input type="date" name="fim" value="${hoje()}" required></label><button class="primario">Gerar relatório</button></form>
      <section class="card"><h2>Seus relatórios</h2>
      ${rels.length ? `<div class="tabela"><table><thead><tr><th>Período</th><th>Treinos</th><th>Dias registrados</th><th>Seguindo o planejamento</th><th></th></tr></thead><tbody>
        ${rels.map((r) => `<tr><td>${fmt(r.periodo_inicio)} a ${fmt(r.periodo_fim)}</td><td>${r.treinos}</td><td>${r.dias_registrados}</td><td>${r.dias_seguindo_plano}</td>
          <td><div class="acoes"><button type="button" data-pdf="${r.id}">Abrir PDF</button>
          ${aut.length ? `<select data-sel="${r.id}" aria-label="Profissional">${aut.map((v) => `<option value="${v.id}">${esc(v.nome)}</option>`).join('')}</select>
            <button type="button" data-comp="${r.id}">Compartilhar</button>` : ''}</div></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vazio">Nenhum relatório ainda. Escolha um período acima e clique em "Gerar relatório".</p>'}
      ${aut.length ? '' : '<p class="nota">Para compartilhar, convide e autorize um profissional na aba Profissionais.</p>'}</section>`;

    $('#f-rel').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api('/relatorios', { method: 'POST', body: { inicio: e.target.inicio.value, fim: e.target.fim.value } }); aviso('Relatório gerado.'); carregarView(); }
      catch (err) { aviso(err.message, true); }
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.pdf) await baixarPdf(b.dataset.pdf);
        if (b.dataset.comp) {
          await api(`/relatorios/${b.dataset.comp}/compartilhar`, { method: 'POST', body: { vinculo_id: Number($(`[data-sel="${b.dataset.comp}"]`).value) } });
          aviso('Relatório compartilhado.');
        }
      } catch (err) { aviso(err.message, true); }
    });
  };

  VIEWS.profissionais = async (el) => {
    const vins = await api('/vinculos');
    el.innerHTML = `<form id="f-vin" class="card"><h2>Convidar um profissional</h2>
        <p class="explica">Informe o e-mail com que o profissional se cadastrou. Ele só poderá ver seus dados depois que você autorizar, e você pode revogar quando quiser.</p>
        <div class="acoes"><input type="email" name="email" placeholder="email@profissional.com" required style="max-width:320px"><button class="primario">Convidar</button></div></form>
      <section class="card"><h2>Seus profissionais</h2>
      ${vins.length ? `<div class="tabela"><table><thead><tr><th>Nome</th><th>Especialidade</th><th>Situação</th><th></th></tr></thead><tbody>
        ${vins.map((v) => `<tr><td>${esc(v.nome)}<br><small>${esc(v.email)}</small></td><td>${esc(v.especialidade)}</td>
          <td><span class="selo ${v.status}">${v.status}</span></td>
          <td>${v.status === 'autorizado' ? `<button type="button" data-vin="${v.id}" data-st="revogado">Revogar acesso</button>` : `<button type="button" class="primario" data-vin="${v.id}" data-st="autorizado">Autorizar acesso</button>`}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vazio">Você ainda não convidou ninguém.</p>'}</section>`;

    $('#f-vin').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api('/vinculos', { method: 'POST', body: { email: e.target.email.value } }); aviso('Convite criado. Autorize o acesso na lista.'); carregarView(); }
      catch (err) { aviso(err.message, true); }
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-vin]'); if (!b) return;
      try { await api(`/vinculos/${b.dataset.vin}`, { method: 'PATCH', body: { status: b.dataset.st } }); aviso(b.dataset.st === 'autorizado' ? 'Acesso autorizado.' : 'Acesso revogado.'); carregarView(); }
      catch (err) { aviso(err.message, true); }
    });
  };

  /* ---------- Telas do profissional ---------- */
  VIEWS.alunos = async (el) => {
    const alunos = await api('/profissional/alunos');
    if (!alunos.length) {
      el.innerHTML = '<section class="card"><h2>Alunos</h2><p class="vazio">Nenhum aluno autorizou o seu acesso ainda. Peça para o aluno convidar você pelo e-mail da sua conta e autorizar.</p></section>';
      return;
    }
    el.innerHTML = `<p class="explica">Você vê apenas os dados de alunos que autorizaram o acesso. As informações são somente para leitura.</p>
      <div class="lista-alunos">${alunos.map((a) => `<button type="button" data-aluno="${a.id}">${esc(a.nome)}</button>`).join('')}</div><div id="detalhe"></div>`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-aluno]'); if (!b) return;
      el.querySelectorAll('[data-aluno]').forEach((x) => x.classList.toggle('ativa', x === b));
      painelComPeriodo($('#detalhe'), async (i, f) => {
        const q = `?inicio=${i}&fim=${f}`;
        const [dash, regs] = await Promise.all([api(`/profissional/alunos/${b.dataset.aluno}/dashboard${q}`), api(`/profissional/alunos/${b.dataset.aluno}/registros${q}`)]);
        return { dash, regs };
      });
    });
  };

  VIEWS.recebidos = async (el) => {
    const lista = await api('/profissional/relatorios');
    el.innerHTML = `<section class="card"><h2>Relatórios recebidos</h2>${lista.length ? `<div class="tabela"><table>
      <thead><tr><th>Aluno</th><th>Período</th><th>Treinos</th><th>Dias registrados</th><th>Recebido em</th><th></th></tr></thead><tbody>
      ${lista.map((r) => `<tr><td>${esc(r.aluno_nome)}</td><td>${fmt(r.periodo_inicio)} a ${fmt(r.periodo_fim)}</td><td>${r.treinos}</td><td>${r.dias_registrados}</td>
        <td>${new Date(r.compartilhado_em).toLocaleDateString('pt-BR')}</td><td><button type="button" data-pdf="${r.id}">Abrir PDF</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="vazio">Nenhum aluno compartilhou relatórios com você ainda.</p>'}</section>`;
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pdf]'); if (!b) return;
      try { await baixarPdf(b.dataset.pdf); } catch (err) { aviso(err.message, true); }
    });
  };

  function render() { token && user ? telaApp() : telaAuth(); }
  render();
})();
