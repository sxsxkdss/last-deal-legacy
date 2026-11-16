// ---------- how to play ----------
const RULES_HTML = {};
RULES_HTML.en = `<p class="rulestag">The House deals one endless deck. Every card has two faces: day and night. Days are played on the casino floor, nights in the back room.</p>
  <h3>Basics</h3><ul>
    <li>Put down a card of the same colour or the same symbol, or a wild. Empty your hand to win.</li>
    <li>Click a card or drag it to the pile. Drag cards sideways to reorder your hand. Hover a card (long-press on a phone) to read it. To draw, click the deck (or press <b>D</b> or <b>Space</b>). If the card you drew fits but you'd rather keep it, click the deck again to pass. A card that doesn't fit passes by itself.</li>
    <li>The host picks the rules and the House cards in the lobby.</li></ul>
  <h3>Day and night</h3><ul>
    <li><b>Shift</b> turns every card over. Day becomes night and the table rules change.</li>
    <li><b>Day, the floor</b>: the slots run, poker hands pay <i>you</i>, the revolver needs a stack of +8.</li>
    <li><b>Night, the back room</b>: no slots, poker hands hit the next player, the revolver works from +4, dynamite under the table.</li>
    <li><b>Eclipse</b> switches day and night for one turn only.</li>
    <li>You see the other face of everyone else's cards and of the next card in the deck. Never your own.</li></ul>
  <h3>Drawing</h3><ul>
    <li>A stack you take and every penalty come in by themselves, one card at a time.</li>
    <li>Drawing till a colour comes (nothing to play, Colour Roulette, Draw Till Colour) is by hand, one click on the deck per card.</li>
    <li>While you owe cards, you can't play.</li></ul>
  <h3>Stacks</h3><ul>
    <li>Answer a draw card with one of the same value or higher: +1, +2, +4, +5, +6, +8, +10, +15. Can't? Click the deck and take the whole stack.</li>
    <li><b>Double Down</b> and <b>Triple Down</b> multiply the stack, up to +60. <b>Mirror</b> sends it back. <b>Vest</b> stops the next one that reaches you. <b>Encore</b> repeats the draw card under it.</li>
    <li><b>Russian roulette</b>: facing a big enough stack, press Roulette and pick a rival. Click (50%): they take the whole stack and play moves on. Bang: you take it doubled.</li></ul>
  <h3>Poker hands</h3><ul>
    <li><b>Picking cards</b>: right-click them (or Ctrl/Shift+click; on a phone press <b>Pick several</b> and tap). The name of the hand shows above your cards. Left-click any picked card, or drag it to the pile, to play them all. A left click on an unpicked card plays only that one.</li>
    <li>Hands are made of number cards. A <b>straight</b> is 4+ numbers in a row in any colours; at 6+ it hits everyone too. A <b>colour run</b> is 3+ in a row of one colour; at 5+ it's a straight flush. <b>Three pair</b> and <b>two sets</b> take 6 cards. A <b>flush</b> is 5+ cards of one colour. One plain <b>Wild</b> can stand in for any number. The first card has to fit the pile. The last one sets the colour.</li>
    <li>The panel under the log shows every hand and what it pays. <b>Drop</b> is how many extra cards go with it. <b>All</b> is what every rival picks up. <b>Debt</b> is what the House lets go.</li>
    <li>By day the extra cards leave your hand and debt is forgiven. At night the next player takes the extras and nothing is forgiven.</li></ul>
  <h3>House cards</h3><ul>
    <li><b>Luck</b>: Horseshoe (debt −15, or two cards out of your hand), Scratch Card (a random win or loss), Jackpot (pulls the slot lever), Redeal (a new hand).</li>
    <li><b>Money</b>: Loan (20¢ now, 30 debt three plays later), Tip (two cards to a player you pick), Contract (half your hand burns, the demon notices).</li>
    <li><b>Violence</b>: Shot Glass (+2 to the next player, or it breaks in your hand), Shotgun (+3 to the next player, +1 to their neighbours), Handcuffs (the next two miss a turn), Spinner (6 plays of random direction changes).</li></ul>
  <h3>Bad cards</h3><ul>
    <li>Rare, grey and hatched, no colour. They never go into poker hands or multi-drops. Pass them on at the start of a deal, or get rid of them with Tip, the Oven or a Redeal.</li>
    <li><b>Lead</b>: goes on anything on your turn, except a stack. The colour stays and you pick up 2. Left in hand: 30 debt.</li>
    <li><b>Leech</b>: only goes down as your last card. Each of your turns starts with +1. After 3 it lets go. Left in hand: 25 debt.</li>
    <li><b>Lit fuse</b>: can't be played. Three of your turns later it goes off in your hand (+4) and is gone. Pass it on and it keeps burning. Left in hand: 25 debt.</li></ul>
  <h3>Slots and dynamite</h3><ul>
    <li>By day the slot machine spins every 8 to 12 plays: Inflation, Shift change, Colour lock, Ante, Payout or U-turn.</li>
    <li>At night a hidden fuse burns down one play at a time. Whoever is up when it blows picks up 3. The table tells you when it is close.</li></ul>
  <h3>Debt match</h3><ul>
    <li>A match is a run of deals. Before each one you pass two cards to the player on one side and get two from the other.</li>
    <li>When someone empties their hand, everyone else <b>pays the House</b> for what they still hold: numbers at face value, action cards 12, big draws and Skip Everyone 20, wilds 25, wild draws and House cards 35, bad cards 25 to 30.</li>
    <li>Every turn costs too: at the start of your turn you pay <b>½ for every card past 10</b>, <b>4 at most</b>.</li>
    <li>Go over the <b>debt limit</b> (250, 500 or 1000, the host picks) and you work for the House as a <b>collector</b>. You can't win any more, but once a deal you can slip someone two cards or pull the slot lever.</li>
    <li>The last player under the limit beats the House.</li>
    <li><b>Chips</b>: the deal's winner gets 5¢ plus 10% of what the others paid. Poker hands pay chips too. Between deals, spend them in the <b>House shop</b>: tokens for the whole match (3 slots), paying off debt, or dirty tricks on a rival.</li></ul>
  <h3>The angel and the demon</h3><ul>
    <li><b>The angel</b> comes by day. Every quiet day turn (no attack played) adds <b>1.25%</b> to the chance it shows up at the start of your turn. Any attack resets it. The angel offers 2 light deals and you have to take one.</li>
    <li><b>The demon</b> comes at night. Make a rival pick up <b>10+ cards</b> at once and it charges: 10.0%, plus 1.5% for every card past 10. The charge waits for night and is rolled at the start of your first night turn. The demon offers 2 dark deals with a price. Sign one or tear it up.</li>
    <li>An <b>attack</b> is any card that makes someone else pick up.</li>
    <li>You can hold up to <b>2 light</b> and <b>3 dark</b> deals at once, all different, for the whole match. <b>One deal per hand</b>: after you sign, the visitors wait for the next deal.</li>
    <li>Sign a dark deal while holding light ones and the light ones burn. The angel never comes back. You keep a <b>Sacrifice</b>: a one-off card that gives a player you pick 10 cards, chained for 2 of their turns.</li>
    <li>Chained cards can't be played or dropped, but you still pay debt on them.</li></ul>
  <h3>The Dark shop</h3><ul>
    <li>After every deal each player gets their own Dark shop with 3 random items. Buy as many as you can afford: 25¢ each, Rent 10¢, Two-Faced 40¢.</li>
    <li>Items wait in your inventory from deal to deal. Use one whenever you like, even on someone else's turn. It works till the end of the hand or at once, then it's gone. Two-Faced and Ward go off by themselves.</li>
    <li>Everyone can see your inventory and what you have running.</li></ul>
  <h3>The Horsemen</h3><ul>
    <li>The first time anyone's debt reaches <b>70% of their limit</b>, one of four horsemen rides in for <b>10 turns</b> (every player's turn counts). If the deal ends first, he stays for the next one.</li>
    <li>After that, every turn has a <b>5% chance</b> of another horseman, once the last one has gone.</li>
    <li><b>Death</b> curses everyone: Darkness, Fever, Mirror World or Static. <b>War</b>: 4 seconds a turn (+3 cards if you're late), or every attack +3, or two quiet cards a turn turning into attacks. <b>Famine</b>: one card a turn, or two cards a turn handed to the smallest hand. <b>Plague</b>: wilds and House cards do nothing, or 3 cards a turn rot and get replaced.</li></ul>
  <h3>Table rules</h3><ul>
    <li><b>Multi-drops</b>: every card with the same symbol goes down together.</li>
    <li><b>Last call</b>: after 150 turns the House closes the table and the fewest cards wins. The table counts down the last 10.</li></ul>
  <h3>Rooms</h3><ul>
    <li>Up to 6 players, no accounts. The host can add bots. The server runs the match, so everyone sees the same table.</li>
    <li>Lose your connection and you have 60 seconds to get back to your seat. Players who step away are skipped after 15 seconds.</li></ul>`;

RULES_HTML.ru = `<p class="rulestag">Дом сдаёт одну бесконечную колоду. У каждой карты два лица: дневное и ночное. Днём играют в зале казино, ночью в подсобке.</p>
  <h3>Основы</h3><ul>
    <li>Кладите карту того же цвета или того же символа, или джокера. Скинули все карты — выиграли.</li>
    <li>Нажмите на карту или перетащите её в сброс. Тащите карты вбок, чтобы переставить их в руке. Наведите на карту (на телефоне подержите палец), чтобы прочитать её. Чтобы взять карту, нажмите на колоду (или <b>D</b>, <b>пробел</b>). Если взятая карта подходит, но вы хотите её придержать, нажмите на колоду ещё раз: это пас. Неподходящая карта пасует сама.</li>
    <li>Правила и карты Дома выбирает хозяин в лобби.</li></ul>
  <h3>День и ночь</h3><ul>
    <li><b>Смена</b> переворачивает все карты. День становится ночью, и правила стола меняются.</li>
    <li><b>День, зал</b>: крутятся слоты, комбинации платят <i>вам</i>, рулетка доступна от стопки +8.</li>
    <li><b>Ночь, подсобка</b>: слотов нет, комбинации бьют следующего, рулетка от +4, под столом динамит.</li>
    <li><b>Затмение</b> меняет день и ночь только на один ход.</li>
    <li>Вы видите обратную сторону чужих карт и следующей карты колоды. Своих — никогда.</li></ul>
  <h3>Как брать карты</h3><ul>
    <li>Взятая стопка и любые штрафы приходят сами, по одной карте.</li>
    <li>Тянуть до цвета (ходить нечем, «Цветная рулетка», «Тяни до цвета») нужно руками: одно нажатие на колоду — одна карта.</li>
    <li>Пока вы должны карты, ходить нельзя.</li></ul>
  <h3>Стопки</h3><ul>
    <li>На «Возьми» отвечайте картой того же номинала или старше: +1, +2, +4, +5, +6, +8, +10, +15. Нечем — нажмите на колоду и забирайте всю стопку.</li>
    <li><b>Дабл</b> и <b>Трипл</b> умножают стопку, до +60. <b>Зеркало</b> отправляет её обратно. <b>Бронежилет</b> держит следующую стопку, дошедшую до вас. <b>Бис</b> повторяет «Возьми» под собой.</li>
    <li><b>Русская рулетка</b>: перед большой стопкой нажмите «Рулетка» и выберите соперника. Щелчок (50%): он забирает всю стопку, и ход идёт дальше. Выстрел: берёте её сами вдвое.</li></ul>
  <h3>Покерные комбинации</h3><ul>
    <li><b>Как выбрать карты</b>: правой кнопкой (или Ctrl/Shift+клик; на телефоне кнопка <b>Выбрать несколько</b> и нажатия). Над рукой появится название комбинации. Левый клик по любой выбранной карте или перетаскивание в сброс играет их все. Левый клик по невыбранной карте играет только её.</li>
    <li>Комбинации собираются из цифр. <b>Стрит</b> — от 4 цифр подряд любых цветов, от 6 он бьёт ещё и всех. <b>Цветной стрит</b> — от 3 подряд одного цвета, от 5 это стрит-флеш. <b>Три пары</b> и <b>два сета</b> — по 6 карт. <b>Флеш</b> — от 5 карт одного цвета. Один простой <b>джокер</b> может заменить любую цифру. Первая карта должна подходить к сбросу, последняя задаёт цвет.</li>
    <li>Под журналом есть таблица всех комбинаций и того, что они дают. <b>Сброс</b> — сколько лишних карт уходит вместе с ней. <b>Всем</b> — сколько берёт каждый соперник. <b>Долг</b> — сколько Дом списывает.</li>
    <li>Днём лишние карты уходят из руки и долг списывается. Ночью лишние берёт следующий, и ничего не списывается.</li></ul>
  <h3>Карты Дома</h3><ul>
    <li><b>Удача</b>: Подкова (долг −15 или две карты из руки), Лотерейка (случайный выигрыш или проигрыш), Джекпот (дёргает рычаг слотов), Пересдача (новая рука).</li>
    <li><b>Деньги</b>: Займ (20¢ сейчас, 30 долга через три хода), Чаевые (две карты выбранному игроку), Контракт (половина руки сгорает, демон берёт на заметку).</li>
    <li><b>Насилие</b>: Рюмка (следующему +2 или бьётся у вас в руке), Обрез (следующему +3, его соседям по 1), Наручники (двое следующих пропускают ход), Вертушка (6 ходов случайных разворотов).</li></ul>
  <h3>Плохие карты</h3><ul>
    <li>Редкие, серые, в штриховку, без цвета. В комбинации и мультисброс не идут. Отдайте их в начале раздачи или избавьтесь Чаевыми, Печью или Пересдачей.</li>
    <li><b>Свинец</b>: кладётся на что угодно в ваш ход, кроме стопки. Цвет не меняется, а вы берёте 2. Осталась в руке: долг 30.</li>
    <li><b>Пиявка</b>: сыграть можно только последней картой. Каждый ваш ход начинается с +1. После трёх раз отстаёт. Осталась в руке: долг 25.</li>
    <li><b>Фитиль</b>: сыграть нельзя. Через три ваших хода взрывается в руке (+4) и пропадает. Отдадите — горит дальше. Осталась в руке: долг 25.</li></ul>
  <h3>Слоты и динамит</h3><ul>
    <li>Днём слот-машина крутится каждые 8–12 ходов: Инфляция, Пересменка, Цвет на замке, Взнос, Выплата или Задний ход.</li>
    <li>Ночью невидимый фитиль горит по ходу за раз. На ком рванёт, тот берёт 3. Когда фитиль почти догорел, стол предупредит.</li></ul>
  <h3>Матч на долг</h3><ul>
    <li>Матч — это несколько раздач. Перед каждой вы передаёте две карты соседу с одной стороны и получаете две с другой.</li>
    <li>Когда кто-то скинул руку, остальные <b>платят Дому</b> за то, что осталось: цифры по номиналу, карты действия 12, большие «Возьми» и пропуск всех 20, джокеры 25, джокеры «Возьми» и карты Дома 35, плохие карты 25–30.</li>
    <li>Ходы тоже стоят денег: в начале своего хода вы платите <b>½ за каждую карту сверх 10</b>, но <b>не больше 4</b>.</li>
    <li>Вышли за <b>лимит долга</b> (250, 500 или 1000, выбирает хозяин) — работаете на Дом <b>коллектором</b>. Выиграть уже нельзя, но раз за раздачу можно подкинуть кому-нибудь две карты или дёрнуть рычаг слотов.</li>
    <li>Последний, кто остался под лимитом, обыгрывает Дом.</li>
    <li><b>Фишки</b>: победитель раздачи получает 5¢ и 10% от того, что заплатили остальные. Комбинации тоже платят фишками. Между раздачами их тратят в <b>лавке Дома</b>: жетоны на весь матч (3 места), погашение долга или пакости сопернику.</li></ul>
  <h3>Ангел и демон</h3><ul>
    <li><b>Ангел</b> приходит днём. Каждый тихий дневной ход (без атак) прибавляет <b>1,25%</b> к шансу, что он появится в начале вашего хода. Любая атака обнуляет шанс. Ангел предлагает 2 светлые сделки, и одну нужно взять.</li>
    <li><b>Демон</b> приходит ночью. Заставьте соперника взять <b>10+ карт</b> за раз, и демон заряжается: 10,0% и ещё 1,5% за каждую карту сверх 10. Заряд ждёт ночи и проверяется в начале вашего первого ночного хода. Демон предлагает 2 тёмные сделки с ценой. Подпишите одну или порвите.</li>
    <li><b>Атака</b> — любая карта, из-за которой кто-то другой берёт карты.</li>
    <li>Одновременно можно держать до <b>2 светлых</b> и <b>3 тёмных</b> сделок, все разные, на весь матч. <b>Одна сделка за раздачу</b>: после подписи гости ждут следующей.</li>
    <li>Подписали тёмную, держа светлые, — светлые сгорают, и ангел больше не придёт. Остаётся <b>Жертва</b>: разовая карта, после которой выбранный игрок берёт 10 карт в цепях на 2 его хода.</li>
    <li>Карты в цепях нельзя сыграть или скинуть, но долг за них идёт.</li></ul>
  <h3>Тёмная лавка</h3><ul>
    <li>После каждой раздачи у каждого своя Тёмная лавка: 3 случайных предмета. Покупайте сколько хватит: 25¢ за штуку, Рента 10¢, Двуличие 40¢.</li>
    <li>Предметы лежат в инвентаре и переходят из раздачи в раздачу. Включайте когда угодно, хоть в чужой ход. Действует до конца раздачи или сразу, потом пропадает. Двуличие и Оберег срабатывают сами.</li>
    <li>Ваш инвентарь и включённые предметы видят все.</li></ul>
  <h3>Всадники</h3><ul>
    <li>Когда чей-то долг впервые доходит до <b>70% лимита</b>, въезжает один из четырёх всадников на <b>10 ходов</b> (считается ход любого игрока). Кончилась раздача раньше — он остаётся на следующую.</li>
    <li>Дальше каждый ход есть <b>шанс 5%</b>, что приедет ещё один, если прежний уже уехал.</li>
    <li><b>Смерть</b> проклинает всех: Мрак, Лихорадка, Зазеркалье или Помехи. <b>Война</b>: 4 секунды на ход (опоздали — +3 карты), или каждая атака +3, или каждый ход две тихие карты становятся атаками. <b>Голод</b>: одна карта за ход, или каждый ход две карты уходят самой маленькой руке. <b>Чума</b>: джокеры и карты Дома ничего не делают, или каждый ход 3 карты гниют и меняются.</li></ul>
  <h3>Правила стола</h3><ul>
    <li><b>Мультисброс</b>: все карты с одним символом ложатся вместе.</li>
    <li><b>Последний звонок</b>: через 150 ходов Дом закрывает стол, и выигрывает тот, у кого меньше карт. Последние 10 ходов стол отсчитывает.</li></ul>
  <h3>Комнаты</h3><ul>
    <li>До 6 игроков, без аккаунтов. Хозяин может посадить ботов. Матч ведёт сервер, поэтому стол у всех один.</li>
    <li>Если пропала связь, у вас 60 секунд, чтобы вернуться на место. Отошедших пропускают через 15 секунд.</li></ul>`;
