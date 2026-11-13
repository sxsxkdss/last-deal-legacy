# Font template: draw every letter as a pixel grid below, run `python3 make_font.py`,
# and you get ui.ttf + ui.woff to drop into assets/font/ (needs: pip install fonttools).
# X = filled pixel. Rows 0..6 sit on the baseline (row 6 touches it); rows 7..8 hang below (g, p, y...).
# Every glyph can be any width; the gap after it is one pixel. Rename the output to display.ttf
# if you only want it for titles, numbers and buttons.
# Rows: 0..6 sit on/above the baseline (row 6 touches it), rows 7..8 are descenders.
import base64, io
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

G = {}
def g(ch, *rows): G[ch] = list(rows)
E5 = '.....'
# digits
g('0','.XXX.','X...X','X..XX','X.X.X','XX..X','X...X','.XXX.')
g('1','..X..','.XX..','..X..','..X..','..X..','..X..','.XXX.')
g('2','.XXX.','X...X','....X','...X.','..X..','.X...','XXXXX')
g('3','XXXXX','...X.','..X..','...X.','....X','X...X','.XXX.')
g('4','...X.','..XX.','.X.X.','X..X.','XXXXX','...X.','...X.')
g('5','XXXXX','X....','XXXX.','....X','....X','X...X','.XXX.')
g('6','..XX.','.X...','X....','XXXX.','X...X','X...X','.XXX.')
g('7','XXXXX','....X','...X.','..X..','.X...','.X...','.X...')
g('8','.XXX.','X...X','X...X','.XXX.','X...X','X...X','.XXX.')
g('9','.XXX.','X...X','X...X','.XXXX','....X','...X.','.XX..')
# latin upper
U = {
'A':['.XXX.','X...X','X...X','XXXXX','X...X','X...X','X...X'],
'B':['XXXX.','X...X','X...X','XXXX.','X...X','X...X','XXXX.'],
'C':['.XXX.','X...X','X....','X....','X....','X...X','.XXX.'],
'D':['XXX..','X..X.','X...X','X...X','X...X','X..X.','XXX..'],
'E':['XXXXX','X....','X....','XXXX.','X....','X....','XXXXX'],
'F':['XXXXX','X....','X....','XXXX.','X....','X....','X....'],
'G':['.XXX.','X...X','X....','X.XXX','X...X','X...X','.XXXX'],
'H':['X...X','X...X','X...X','XXXXX','X...X','X...X','X...X'],
'I':['XXX','.X.','.X.','.X.','.X.','.X.','XXX'],
'J':['..XXX','...X.','...X.','...X.','...X.','X..X.','.XX..'],
'K':['X...X','X..X.','X.X..','XX...','X.X..','X..X.','X...X'],
'L':['X....','X....','X....','X....','X....','X....','XXXXX'],
'M':['X...X','XX.XX','X.X.X','X.X.X','X...X','X...X','X...X'],
'N':['X...X','X...X','XX..X','X.X.X','X..XX','X...X','X...X'],
'O':['.XXX.','X...X','X...X','X...X','X...X','X...X','.XXX.'],
'P':['XXXX.','X...X','X...X','XXXX.','X....','X....','X....'],
'Q':['.XXX.','X...X','X...X','X...X','X.X.X','X..X.','.XX.X'],
'R':['XXXX.','X...X','X...X','XXXX.','X.X..','X..X.','X...X'],
'S':['.XXXX','X....','X....','.XXX.','....X','....X','XXXX.'],
'T':['XXXXX','..X..','..X..','..X..','..X..','..X..','..X..'],
'U':['X...X','X...X','X...X','X...X','X...X','X...X','.XXX.'],
'V':['X...X','X...X','X...X','X...X','X...X','.X.X.','..X..'],
'W':['X...X','X...X','X...X','X.X.X','X.X.X','X.X.X','.X.X.'],
'X':['X...X','X...X','.X.X.','..X..','.X.X.','X...X','X...X'],
'Y':['X...X','X...X','.X.X.','..X..','..X..','..X..','..X..'],
'Z':['XXXXX','....X','...X.','..X..','.X...','X....','XXXXX'],
}
G.update(U)
L = {
'a':[E5,E5,'.XXX.','....X','.XXXX','X...X','.XXXX'],
'b':['X....','X....','XXXX.','X...X','X...X','X...X','XXXX.'],
'c':[E5,E5,'.XXX.','X....','X....','X...X','.XXX.'],
'd':['....X','....X','.XXXX','X...X','X...X','X...X','.XXXX'],
'e':[E5,E5,'.XXX.','X...X','XXXXX','X....','.XXX.'],
'f':['..XX','.X..','XXX.','.X..','.X..','.X..','.X..'],
'g':[E5,E5,'.XXXX','X...X','X...X','.XXXX','....X','XXXX.'],
'h':['X....','X....','XXXX.','X...X','X...X','X...X','X...X'],
'i':['X','.','X','X','X','X','X'],
'j':['..X','...','..X','..X','..X','..X','..X','XX.'],
'k':['X...','X...','X..X','X.X.','XX..','X.X.','X..X'],
'l':['X.','X.','X.','X.','X.','X.','.X'],
'm':[E5,E5,'XX.X.','X.X.X','X.X.X','X.X.X','X...X'],
'n':[E5,E5,'XXXX.','X...X','X...X','X...X','X...X'],
'o':[E5,E5,'.XXX.','X...X','X...X','X...X','.XXX.'],
'p':[E5,E5,'XXXX.','X...X','X...X','XXXX.','X....','X....'],
'q':[E5,E5,'.XXXX','X...X','X...X','.XXXX','....X','....X'],
'r':['....','....','X.XX','XX..','X...','X...','X...'],
's':[E5,E5,'.XXXX','X....','.XXX.','....X','XXXX.'],
't':['....','.X..','XXX.','.X..','.X..','.X..','..XX'],
'u':[E5,E5,'X...X','X...X','X...X','X...X','.XXXX'],
'v':[E5,E5,'X...X','X...X','X...X','.X.X.','..X..'],
'w':[E5,E5,'X...X','X...X','X.X.X','X.X.X','.X.X.'],
'x':[E5,E5,'X...X','.X.X.','..X..','.X.X.','X...X'],
'y':[E5,E5,'X...X','X...X','X...X','.XXXX','....X','.XXX.'],
'z':[E5,E5,'XXXXX','...X.','..X..','.X...','XXXXX'],
}
G.update(L)
# cyrillic upper
for a,b in zip('АВЕКМНОРСТХ','ABEKMHOPCTX'): G[a]=G[b]
C = {
'Б':['XXXXX','X....','X....','XXXX.','X...X','X...X','XXXX.'],
'Г':['XXXXX','X....','X....','X....','X....','X....','X....'],
'Д':['..XX.','.X.X.','.X.X.','.X.X.','.X.X.','XXXXX','X...X'],
'Ё':['.X.X.','XXXXX','X....','XXXX.','X....','X....','XXXXX'],
'Ж':['X.X.X','X.X.X','.XXX.','..X..','.XXX.','X.X.X','X.X.X'],
'З':['.XXX.','X...X','....X','..XX.','....X','X...X','.XXX.'],
'И':['X...X','X...X','X..XX','X.X.X','XX..X','X...X','X...X'],
'Й':['.X.X.','..X..','X...X','X..XX','X.X.X','XX..X','X...X'],
'Л':['..XXX','.X..X','.X..X','.X..X','.X..X','.X..X','X...X'],
'П':['XXXXX','X...X','X...X','X...X','X...X','X...X','X...X'],
'У':['X...X','X...X','X...X','.XXXX','....X','X...X','.XXX.'],
'Ф':['..X..','.XXX.','X.X.X','X.X.X','.XXX.','..X..','..X..'],
'Ц':['X..X.','X..X.','X..X.','X..X.','X..X.','XXXXX','....X'],
'Ч':['X...X','X...X','X...X','.XXXX','....X','....X','....X'],
'Ш':['X.X.X','X.X.X','X.X.X','X.X.X','X.X.X','X.X.X','XXXXX'],
'Щ':['X.X.X','X.X.X','X.X.X','X.X.X','X.X.X','X.X.X','XXXXX','....X'],
'Ъ':['XX...','.X...','.X...','.XXX.','.X..X','.X..X','.XXX.'],
'Ы':['X...X','X...X','X...X','XX..X','X.X.X','X.X.X','XX..X'],
'Ь':['X....','X....','X....','XXXX.','X...X','X...X','XXXX.'],
'Э':['.XXX.','X...X','....X','..XXX','....X','X...X','.XXX.'],
'Ю':['X..X.','X.X.X','X.X.X','XXX.X','X.X.X','X.X.X','X..X.'],
'Я':['.XXXX','X...X','X...X','.XXXX','..X.X','.X..X','X...X'],
}
G.update(C)
for a,b in zip('аеорсухк','aeopcyxk'): G[a]=G[b]
c = {
'б':['..XXX','.X...','X....','XXXX.','X...X','X...X','.XXX.'],
'в':[E5,E5,'XXXX.','X...X','XXXX.','X...X','XXXX.'],
'г':['....','....','XXXX','X...','X...','X...','X...'],
'д':[E5,E5,'..XX.','.X.X.','.X.X.','XXXXX','X...X'],
'ё':['.X.X.',E5,'.XXX.','X...X','XXXXX','X....','.XXX.'],
'ж':[E5,E5,'X.X.X','.XXX.','..X..','.XXX.','X.X.X'],
'з':[E5,E5,'.XXX.','X...X','..XX.','X...X','.XXX.'],
'и':[E5,E5,'X...X','X..XX','X.X.X','XX..X','X...X'],
'й':[E5,'..X..','X...X','X..XX','X.X.X','XX..X','X...X'],
'л':[E5,E5,'..XXX','.X..X','.X..X','.X..X','X...X'],
'м':[E5,E5,'X...X','XX.XX','X.X.X','X...X','X...X'],
'н':[E5,E5,'X...X','X...X','XXXXX','X...X','X...X'],
'п':[E5,E5,'XXXXX','X...X','X...X','X...X','X...X'],
'т':[E5,E5,'XXXXX','..X..','..X..','..X..','..X..'],
'ф':[E5,'..X..','.XXX.','X.X.X','X.X.X','.XXX.','..X..','..X..'],
'ц':[E5,E5,'X..X.','X..X.','X..X.','XXXXX','....X'],
'ч':[E5,E5,'X...X','X...X','.XXXX','....X','....X'],
'ш':[E5,E5,'X.X.X','X.X.X','X.X.X','X.X.X','XXXXX'],
'щ':[E5,E5,'X.X.X','X.X.X','X.X.X','X.X.X','XXXXX','....X'],
'ъ':[E5,E5,'XX...','.XXX.','.X..X','.X..X','.XXX.'],
'ы':[E5,E5,'X...X','X...X','XX..X','X.X.X','XX..X'],
'ь':['....','....','X...','XXX.','X..X','X..X','XXX.'],
'э':[E5,E5,'.XXX.','X...X','..XXX','X...X','.XXX.'],
'ю':[E5,E5,'X..X.','X.X.X','XXX.X','X.X.X','X..X.'],
'я':[E5,E5,'.XXXX','X...X','.XXXX','.X..X','X...X'],
}
G.update(c)
# punctuation and symbols
P = {
' ':['...']*7,
'.':['.']*6+['X'],
',':['..']*5+['.X','.X','X.'],
':':['.','.','X','.','.','X','.'],
';':['..','..','.X','..','..','.X','X.'],
'!':['X','X','X','X','X','.','X'],
'?':['.XXX.','X...X','....X','...X.','..X..',E5,'..X..'],
"'":['X','X','.','.','.','.','.'],
'"':['X.X','X.X','...','...','...','...','...'],
'-':['....','....','....','XXXX','....','....','....'],
'–':[E5,E5,E5,'XXXXX',E5,E5,E5],
'+':[E5,'..X..','..X..','XXXXX','..X..','..X..',E5],
'×':[E5,'X...X','.X.X.','..X..','.X.X.','X...X',E5],
'=':[E5,E5,'XXXXX',E5,'XXXXX',E5,E5],
'/':['....X','....X','...X.','..X..','.X...','X....','X....'],
'\\':['X....','X....','.X...','..X..','...X.','....X','....X'],
'(':['..X','.X.','X..','X..','X..','.X.','..X'],
')':['X..','.X.','..X','..X','..X','.X.','X..'],
'[':['XX','X.','X.','X.','X.','X.','XX'],
']':['XX','.X','.X','.X','.X','.X','XX'],
'%':['XX..X','XX..X','...X.','..X..','.X...','X..XX','X..XX'],
'#':['.X.X.','.X.X.','XXXXX','.X.X.','XXXXX','.X.X.','.X.X.'],
'$':['..X..','.XXXX','X.X..','.XXX.','..X.X','XXXX.','..X..'],
'&':['.XX..','X..X.','X.X..','.X...','X.X.X','X..X.','.XX.X'],
'*':[E5,'X.X.X','.XXX.','XXXXX','.XXX.','X.X.X',E5],
'<':['...X','..X.','.X..','X...','.X..','..X.','...X'],
'>':['X...','.X..','..X.','...X','..X.','.X..','X...'],
'«':['....','....','.X.X','X.X.','.X.X','....','....'],
'»':['....','....','X.X.','.X.X','X.X.','....','....'],
'‹':['...','...','.X.','X..','.X.','...','...'],
'›':['...','...','X..','.X.','X..','...','...'],
'·':['.','.','.','X','.','.','.'],
'…':[E5,E5,E5,E5,E5,E5,'X.X.X'],
'→':[E5,'..X..','...X.','XXXXX','...X.','..X..',E5],
'←':[E5,'..X..','.X...','XXXXX','.X...','..X..',E5],
'↔':['.......','..X.X..','.X...X.','XXXXXXX','.X...X.','..X.X..','.......'],
'↻':['.XX.X','X..XX','X.XXX','X....','X...X','.XXX.',E5],
'↺':['X.XX.','XX..X','XXX.X','....X','X...X','.XXX.',E5],
'|':['X']*7,
'_':[E5]*7+['XXXXX'],
'@':['.XXX.','X...X','X.XXX','X.X.X','X.XXX','X....','.XXX.'],
'^':['..X..','.X.X.','X...X',E5,E5,E5,E5],
'~':[E5,E5,'.X..X','X.XX.',E5,E5,E5],
'°':['XXX','X.X','XXX','...','...','...','...'],
'№':['X..X...','XX.X...','X.XX.XX','X..XX.X','X..X.XX','X..X...','X..X.XX'],
'✓':[E5,'....X','...X.','X.X..','.X...',E5,E5],
}
G.update(P)
for a,b in [('—','–'),('−','–'),('‘',"'"),('’',"'"),('“','"'),('”','"'),('„','"'),('…','…'),('↑','^')]: G.setdefault(a, G[b])
G['—'] = G['–']

PXU = 100  # font units per pixel
fb = FontBuilder(1000, isTTF=True)
names = ['.notdef'] + ['u%04X' % ord(ch) for ch in G]
fb.setupGlyphOrder(names)
fb.setupCharacterMap({ord(ch): 'u%04X' % ord(ch) for ch in G})
glyphs, metrics = {}, {}
pen = TTGlyphPen(None); glyphs['.notdef'] = pen.glyph(); metrics['.notdef'] = (600, 0)
for ch, rows in G.items():
    pen = TTGlyphPen(None)
    w = max(len(r) for r in rows)
    for r, row in enumerate(rows):
        top = (7 - r) * PXU; bot = top - PXU
        x = 0
        while x < len(row):
            if row[x] == 'X':
                x0 = x
                while x < len(row) and row[x] == 'X': x += 1
                X0, X1 = x0 * PXU, x * PXU
                # rows overlap a hair so adjacent runs never leave seams
                pen.moveTo((X0, bot - 1)); pen.lineTo((X0, top + 1)); pen.lineTo((X1, top + 1)); pen.lineTo((X1, bot - 1)); pen.closePath()
            else: x += 1
    glyphs['u%04X' % ord(ch)] = pen.glyph()
    metrics['u%04X' % ord(ch)] = ((w + 1) * PXU, 0)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({'familyName': 'MyPixelFont', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=800, usWinDescent=200, fsSelection=0x40)
fb.setupPost()
import os
here = os.path.dirname(os.path.abspath(__file__))
fb.save(os.path.join(here, 'ui.ttf'))
fb.font.flavor = 'woff'; fb.save(os.path.join(here, 'ui.woff'))
print('glyphs', len(G), '-> ui.ttf, ui.woff')
