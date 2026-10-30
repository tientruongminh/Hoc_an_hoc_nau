import { COLORS, FONT } from '../config';
import { Cloud } from '../systems/Cloud';

/**
 * Sign-in / sign-up form as real DOM over the canvas, so typing (Vietnamese
 * IME, password managers, phone keyboards) works natively. Resolves when closed.
 */
export function openAuthPanel(input: Phaser.Input.InputPlugin): Promise<void> {
  const kb = input.keyboard;
  if (kb) {
    kb.enabled = false;
    kb.disableGlobalCapture();
  }

  ensureStyles();
  const root = document.createElement('div');
  root.className = 'haohn-auth';
  // Keys typed here must never reach the game underneath.
  for (const t of ['keydown', 'keyup'] as const) root.addEventListener(t, (e) => e.stopPropagation());

  return new Promise((resolve) => {
    const close = () => {
      root.classList.add('out');
      setTimeout(() => root.remove(), 160);
      if (kb) {
        kb.enabled = true;
        kb.enableGlobalCapture();
        kb.resetKeys();
      }
      resolve();
    };
    root.addEventListener('pointerdown', (e) => e.target === root && close());
    root.addEventListener('keydown', (e) => e.key === 'Escape' && close());

    const render = (mode: 'login' | 'register') => {
      root.innerHTML = '';
      const card = el('form', 'card');
      card.noValidate = true;
      root.append(card);

      if (Cloud.user) {
        card.append(
          el('h2', '', 'Tài khoản'),
          el('p', 'who', `Đang chơi với tên <b>${esc(Cloud.user.displayName)}</b> (${esc(Cloud.user.username)})`),
          el('p', 'note', 'Tiến độ được lưu lên máy chủ mỗi khi bạn qua một mốc. Vào lại ở máy nào cũng chơi tiếp được.'),
        );
        const out = button('Đăng xuất', 'ghost');
        const back = button('Đóng', 'primary');
        out.type = 'button';
        out.onclick = async () => {
          out.disabled = true;
          await Cloud.logout();
          close();
        };
        back.type = 'button';
        back.onclick = close;
        card.append(row(out, back));
        back.focus();
        return;
      }

      const tabs = el('div', 'tabs');
      const tLogin = button('Đăng nhập', mode === 'login' ? 'tab on' : 'tab');
      const tReg = button('Tạo tài khoản', mode === 'register' ? 'tab on' : 'tab');
      tLogin.type = tReg.type = 'button';
      tLogin.onclick = () => render('login');
      tReg.onclick = () => render('register');
      tabs.append(tLogin, tReg);

      const user = field('Tên đăng nhập', 'text', 'username');
      const display = field('Tên hiển thị (tuỳ chọn)', 'text', 'nickname');
      const pass = field('Mật khẩu', 'password', mode === 'login' ? 'current-password' : 'new-password');
      const err = el('p', 'err');
      const submit = button(mode === 'login' ? 'Vào chơi tiếp' : 'Tạo và lưu tiến độ', 'primary');
      const guest = button('Chơi không cần tài khoản', 'ghost');
      guest.type = 'button';
      guest.onclick = close;

      card.append(
        tabs,
        el('p', 'note', mode === 'login' ? 'Đăng nhập để chơi tiếp đúng chỗ đã dừng, ở máy nào cũng được.' : 'Tiến độ đang chơi trên máy này sẽ được giữ lại trong tài khoản mới.'),
        user.wrap,
        ...(mode === 'register' ? [display.wrap] : []),
        pass.wrap,
        err,
        row(guest, submit),
      );

      card.onsubmit = async (e) => {
        e.preventDefault();
        err.textContent = '';
        submit.disabled = true;
        submit.textContent = 'Đang xử lý…';
        const r =
          mode === 'login'
            ? await Cloud.login(user.input.value, pass.input.value)
            : await Cloud.register(user.input.value, pass.input.value, display.input.value || undefined);
        if (r.ok) return close();
        err.textContent = r.message;
        submit.disabled = false;
        submit.textContent = mode === 'login' ? 'Vào chơi tiếp' : 'Tạo và lưu tiến độ';
        pass.input.select();
      };
      user.input.focus();
    };

    render('login');
    document.body.append(root);
  });
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
function button(label: string, cls: string) {
  const b = el('button', cls);
  b.textContent = label;
  return b;
}
function row(...kids: HTMLElement[]) {
  const r = el('div', 'row');
  r.append(...kids);
  return r;
}
function field(label: string, type: string, autocomplete: string) {
  const wrap = el('label', 'field');
  const span = el('span');
  span.textContent = label;
  const input = el('input');
  input.type = type;
  input.autocomplete = autocomplete as AutoFill;
  input.spellcheck = false;
  input.autocapitalize = 'off';
  wrap.append(span, input);
  return { wrap, input };
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function ensureStyles() {
  if (document.getElementById('haohn-auth-css')) return;
  const s = document.createElement('style');
  s.id = 'haohn-auth-css';
  s.textContent = `
.haohn-auth{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(18,13,10,.62);font-family:${FONT};animation:haohn-in .18s ease-out}
.haohn-auth.out{opacity:0;transition:opacity .15s}
.haohn-auth .card{width:min(440px,100%);box-sizing:border-box;padding:26px 26px 22px;border-radius:18px;
  background:${COLORS.paper};color:${COLORS.ink};border:4px solid ${COLORS.ink};box-shadow:0 10px 0 ${COLORS.shadow};
  display:flex;flex-direction:column;gap:12px;animation:haohn-pop .22s cubic-bezier(.3,1.4,.6,1)}
.haohn-auth h2{margin:0;font-size:26px;font-weight:800;color:${COLORS.accentDark};text-align:center}
.haohn-auth .note{margin:0;font-size:14px;line-height:1.45;color:#6b5644}
.haohn-auth .who{margin:0;font-size:17px}
.haohn-auth .tabs{display:flex;gap:6px;background:${COLORS.paperDark};border-radius:12px;padding:4px}
.haohn-auth .tab{flex:1;padding:9px;border:0;border-radius:9px;background:transparent;font:700 16px ${FONT};color:#7d6a58;cursor:pointer}
.haohn-auth .tab.on{background:${COLORS.paper};color:${COLORS.accentDark};box-shadow:0 2px 0 ${COLORS.shadow}}
.haohn-auth .field{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600}
.haohn-auth input{font:500 17px ${FONT};padding:10px 12px;border-radius:10px;border:2px solid #b9a58a;background:#fffaf0;color:${COLORS.ink};outline:none}
.haohn-auth input:focus{border-color:${COLORS.accent};box-shadow:0 0 0 3px rgba(217,87,43,.2)}
.haohn-auth .err{margin:0;min-height:1.2em;font-size:14px;font-weight:600;color:${COLORS.danger}}
.haohn-auth .row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.haohn-auth .row button{padding:11px 16px;border-radius:11px;font:700 16px ${FONT};cursor:pointer;border:3px solid ${COLORS.ink}}
.haohn-auth .primary{background:${COLORS.accent};color:#fff;box-shadow:0 4px 0 ${COLORS.accentDark}}
.haohn-auth .primary:active{transform:translateY(3px);box-shadow:0 1px 0 ${COLORS.accentDark}}
.haohn-auth .primary:disabled{opacity:.7;cursor:wait}
.haohn-auth .ghost{padding-left:2px!important;padding-right:2px!important;background:transparent;color:${COLORS.ink};border-color:transparent!important;text-decoration:underline}
@keyframes haohn-in{from{opacity:0}}
@keyframes haohn-pop{from{transform:scale(.88);opacity:0}}
`;
  document.head.append(s);
}
