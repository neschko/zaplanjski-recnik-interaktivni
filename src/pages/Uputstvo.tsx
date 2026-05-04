export default function Uputstvo() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-secondary">Упутство</h1>
      <p className="text-muted-foreground mt-1">Како користити Заплањски Речник.</p>

      <h2 className="font-serif text-xl text-secondary mt-6">Анализа говора</h2>
      <p className="mt-2 text-foreground/85">На страници <strong>Анализа</strong> можеш послати <strong>аудио снимак</strong> (фајл или снимљено са микрофона)
      или унети текст. Lovable AI ће сам транскрибовати снимак и одредити дијалекат — без додатних кључева.
      Подржани формати: mp3, wav, m4a, webm, ogg (до ~5MB по снимку).</p>

      <h2 className="font-serif text-xl text-secondary mt-6">Речник</h2>
      <ul className="list-disc list-inside space-y-1 mt-2 text-foreground/85">
        <li><strong>Основни</strong> — званичне одреднице (само администратори додају).</li>
        <li><strong>Лични</strong> — твој радни простор.</li>
        <li><strong>Заједнички</strong> — дељени online речник свих корисника.</li>
      </ul>

      <h2 className="font-serif text-xl text-secondary mt-6">Дубока интеграција</h2>
      <p className="mt-2 text-foreground/85">После анализе, препознате речи које постоје у речнику постају линкови;
      непознате можеш одмах додати у Лични или Заједнички речник једним кликом.</p>

      <h2 className="font-serif text-xl text-secondary mt-6">Налог</h2>
      <p className="mt-2 text-foreground/85">За додавање одредница и коментара потребна је пријава.
      Без налога можеш претраживати речник и правити анонимне анализе.</p>
    </div>
  );
}