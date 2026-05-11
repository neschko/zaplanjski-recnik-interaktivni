export default function Uputstvo() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-secondary">Упутство</h1>
      <p className="text-muted-foreground mt-1">Како користити Заплањски Речник — жива реч и AI анализа дијалеката југоисточне Србије.</p>

      <h2 className="font-serif text-xl text-secondary mt-6">Анализа говора</h2>
      <p className="mt-2 text-foreground/85">
        На страници <strong>Анализа</strong> можеш послати <strong>аудио снимак</strong> (фајл или снимљено са микрофона)
        или унети текст. Lovable AI самостално транскрибује снимак и одређује дијалекат — без додатних кључева ни подешавања.
        Подржани формати: mp3, wav, m4a, webm, ogg (до ~5MB по снимку).
      </p>
      <p className="mt-2 text-foreground/85">
        Подржани дијалекти: Призренско-јужноморавски, Сврљишко-заплањски, Тимочко-лужнички, Косовско-ресавски,
        Шумадијско-војвођански, <strong>Јужна Србија</strong>, Остало и Непознато.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Речник</h2>
      <ul className="list-disc list-inside space-y-1 mt-2 text-foreground/85">
        <li><strong>Основни</strong> — званичне одреднице које додају искључиво администратори.</li>
        <li><strong>Лични</strong> — твој приватни радни простор за нацрте и сопствене речи.</li>
        <li><strong>Заједнички</strong> — дељени online речник свих корисника.</li>
      </ul>
      <p className="mt-2 text-foreground/85">
        Речи можеш претраживати по слову српске азбуке, по дијалекту или слободним уносом текста. Свака реч има
        своју страницу са дефиницијом, примерима, дијалектом и коментарима.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Додавање нове речи</h2>
      <p className="mt-2 text-foreground/85">
        Кликом на <strong>„Додај нову реч“</strong> отвара се форма у којој уносиш реч, дефиницију, примере и дијалекат.
        Уз поља за унос налази се <strong>Брзи акценатор</strong> — алат за уметање ћириличних акценатских знакова
        (краткосилазни, дугоузлазни, дугосилазни, краткоузлазни и дужина). Знакове умећеш кликом на дугмад
        или пречицама <kbd>Alt+1</kbd> до <kbd>Alt+5</kbd> на месту курсора.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Коментари</h2>
      <p className="mt-2 text-foreground/85">
        Коментаре на свакој речи може да оставља <strong>свако</strong> — и без пријаве — како би се подстакао
        живи разговор о значењима, изговору и употреби.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Извоз речника</h2>
      <p className="mt-2 text-foreground/85">
        Речник можеш да преузмеш у <strong>PDF</strong> или <strong>EPUB</strong> формату, ради штампе или читања
        ван мреже на читачима електронских књига.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Дубока интеграција</h2>
      <p className="mt-2 text-foreground/85">
        После анализе говора, препознате речи које постоје у речнику постају линкови ка својим страницама;
        непознате можеш одмах додати у Лични или Заједнички речник једним кликом.
      </p>

      <h2 className="font-serif text-xl text-secondary mt-6">Налог</h2>
      <p className="mt-2 text-foreground/85">
        За додавање одредница потребна је пријава. Без налога можеш претраживати речник, правити анонимне анализе
        и остављати коментаре.
      </p>
    </div>
  );
}
