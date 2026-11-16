# Builds ../index.html from the sources in this folder. Run: python3 src/build.py  (from the repo root or from src/)
#   ui.html            page template (/*STYLE*/, /*ENGINE*/, /*CONTROLLER*/ are filled in)
#   style.css          the stylesheet
#   ../engine.js       game rules, shared with the server
#   i18n/*.js          all text (EN + RU), in file order
#   assets.js, fx2.js  music/sound packs and visual effects
#   client/*.js        the client, split by area, in file order (one global script)
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
p = lambda *a: os.path.join(here, *a)
src = lambda f: open(f, encoding='utf-8').read()
i18n = '\n'.join(src(f) for f in sorted(glob.glob(p('i18n', '*.js'))))
client = '\n'.join([i18n, src(p('assets.js')), src(p('fx2.js'))] + [src(f) for f in sorted(glob.glob(p('client', '*.js')))])
out = src(p('ui.html')).replace('/*STYLE*/', src(p('style.css'))).replace('/*ENGINE*/', src(p('..', 'engine.js'))).replace('/*CONTROLLER*/', client)
open(p('..', 'index.html'), 'w', encoding='utf-8').write(out)
print('index.html', len(out))
