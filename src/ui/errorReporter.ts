export function installErrorReporter(): void {
  const show = (title: string, detail: string): void => {
    let box = document.getElementById('fatal-error-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'fatal-error-box';
      box.style.cssText =
        'position:fixed;left:16px;bottom:16px;z-index:9999;max-width:min(640px,90vw);' +
        'background:rgba(60,10,14,.96);color:#ffd9d4;border:1px solid #ff6b6b;' +
        'border-radius:12px;padding:12px 16px;font:13px/1.6 "Microsoft YaHei",sans-serif;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.6);white-space:pre-wrap;cursor:pointer;';
      box.title = '点击关闭';
      box.addEventListener('click', () => box!.remove());
      document.body.appendChild(box);
    }
    box.textContent = `${title}\n${detail.slice(0, 800)}`;
  };

  window.addEventListener('error', (e) => {
    if (e.message) {
      show('页面运行时错误', `${e.message}\n${e.filename ?? ''}:${e.lineno ?? ''}`);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const msg = r instanceof Error ? `${r.name}: ${r.message}` : String(r);
    show('异步错误', msg);
  });
}
