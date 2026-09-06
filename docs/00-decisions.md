# hodos — свод решений (рабочий документ, 2026-08-30)

Статус: черновик для перечитывания. После апрува превращается в `docs/DESIGN.md`, `COMPONENTS.md`, `AUTHORING.md`, `BUILD-PLAN.md` (английский). Идентификаторы решений (D, R, K, S, C, M, I, H, T, P) — из обсуждения.

> **Historical.** This is the approved design log of 2026-08-30, kept as it was written. It is binding as the origin of every mechanism here, and it is **not** the current specification: `DESIGN.md` is, and on a conflict `DESIGN.md` wins with the conflict recorded in `DECISIONS.md` (decision **0001**). Every section a later decision moved carries a marker at the section saying which decision moved it and where the current sentence lives. A section with no marker still holds.

---

## 0. Идентичность

- **Имя:** `hodos` (ὁδός — путь; μέθοδος = «путь вслед»). Команды `/hodos:task`, `/hodos:run`, `/hodos:init`, `/hodos:status`. Имя плагина immutable.
- **Open source, MIT, для кого угодно.** Engine (скиллы, агенты, хуки, скрипты, README, docs) — английский. Артефакты, которые init пишет в проект — на языке команды проекта (`config.language`).
- **Позиционирование** («чем не superpowers»): *project-aware + frugal + bounded + verified* — init выводит правила из кода и источников; токены — ось дизайна; циклы ограничены конструкцией; результат проверяется запуском по проектному рецепту.
- **Для кого:** реальные разработчики в бизнесе, не vibe-coding. Разработчик — драйвер идей и решений, система ведёт по процессу и снимает когнитивную нагрузку.
- **Non-goals v1:** синхронизация с трекером; автономный режим «rulings без человека» (есть как выключенная опция); worktree на задачу; agent teams; Workflow-tool; cross-model ревью (опция конфига, не ядро); desktop-верификация; мульти-репо «канон/зеркало» правил (плагин решает это сам — engine общий, правила per repo).

## 1. Принципы (устойчивые, из 6 прошлых попыток + ресёрч)

1. Фазы — файловые handoff'ы, не «продолжаем в том же контексте».
2. Каждая фаза пишет артефакт под слагом; артефакт — контракт.
3. Автор ≠ ревьюер **механически**: ревью и verify — свежие субагенты без истории сессии.
4. Каждое утверждение с источником (`file:line`, версия, URL), или удаляется.
5. Внешний факт — из источника (код пакета → Context7 с версией → доки), не из памяти. Версия — из lockfile.
6. Хук — enforcement, промпт — просьба. Но: **система не ломает проекты** — enforcement только opt-in.
7. Хуки fail-open; в шапке — инцидент, из-за которого хук появился.
8. Решения — таблица `вопрос → варианты (≥2, минусы у каждого) → рекомендация → выбор за юзером`. Рекомендация обязательна.
9. Агент не решает за человека то, что план не закрыл (см. R4/K6).
10. Экономия контекста — ось дизайна: файлы вместо контекста, списки файлов вместо пересказов, один ревьюер, тиринг моделей.
11. Прецеденты бьют абстракции: правила цитируют `file:line` и инцидент.
12. Уборка — часть процесса: `/finish` сворачивает и удаляет; `/status` называет протухшее.
13. Правила — только реактивные, с evidence; «сделает ли модель это без правила? — правило не нужно».
14. Рубрика текста (Pocock): no-op тест по предложениям (удалять предложение целиком), leading words вместо триад, позитивные рецепты без nuance-clauses, у каждого шага completion criterion + названный антипаттерн; two loads — context load (токены) vs cognitive load (человек-индекс, цена агентности, не минимизировать).
15. Больше правил ≠ лучше. Лимиты enforce'ятся линтом, не прозой.

## 2. Архитектура: engine / project

> **Superseded in part.** Three sentences of this section were moved by later decisions, and the header rule ("a section with no marker still holds") would otherwise assert them. **The plugin layout's `evals/ (fixtures/, scenarios/)`** — the evaluation assets are `bench/`, and `evals/` is Claude Code's own eval directory, which hodos does not use (decision **0005**, `PLATFORM-NOTES.md` fact 47; the layout as built is `DESIGN.md §3.1`). **`enabledPlugins` в проектных settings** — `init` no longer writes it (decision **0010**; what `init` writes is `COMPONENTS.md §1.3`). **«`skillOverrides` на плагин не действует → ноль model-invocable скиллов»** — three are invocable and the rest carry `disable-model-invocation: true` (decision **0016**, and §3's own marker at this file's `:64`; the current sentence is `DESIGN.md §11`).

**D1. Plugin-first.** Engine = Claude Code плагин. Layout двусовместим с skills.sh с нуля:
```
hodos/
  .claude-plugin/plugin.json + marketplace.json
  skills/<name>/SKILL.md (+ references/*.md)   # все user-invoked
  agents/hodos-*.md                            # reviewer, verifier
  hooks/hooks.json
  scripts/*.mjs                                # zero-dep Node ≥18 (гарантирован Claude Code)
  adapters/<role>/<tool>.md
  sources/<stack>.md                           # индекс источников best practices (pointers)
  evals/ (fixtures/, scenarios/)
  docs/
```
Переход на локальную установку — только при конкретном блокере (кандидатов нет).

**Проект** получает от init: `CLAUDE.md` (карта ≤60 строк или managed-блок), `.claude/rules/*.md`, `.claude/hodos/config.json`, `.claude/hodos/{campaigns,tasks}/`, `.gitignore`, `enabledPlugins` в проектных settings, одобренные хуки.

**Ограничения плагина, учтённые:** плагин не шипит CLAUDE.md/rules (пишет init); агенты плагина без `hooks`/`mcpServers`/`permissionMode`; агенты с префиксом `hodos-` (иначе проигрывают проектным по имени); хуки плагина глобальны → первой строкой проверяют наличие `config.json` (вверх до git-root), нет → `exit 0`; `skillOverrides` на плагин не действует → ноль model-invocable скиллов.

**Самодостаточность (I-4):** никаких внешних стек-скиллов. Знание стека — правила из init + research в момент задачи.

**Адаптеры (I-5):** фазы зовут **роль** (`browser.screenshot`, `codeIndex.findReferences`, `tracker.link`, `design.getFrame`), адаптер — файл ≤30 строк «роль → MCP-тулы + gotchas» (`chrome-devtools`, `ariadne`, `youtrack`, `figma`). Init детектит по `.mcp.json`. Нет адаптера, есть MCP → ToolSearch fallback; нет ничего → явный `Skip`. Community добавляет файлом.

## 3. Вход и маршрутизация

> **Superseded in part.** D2's "ноль скиллов в листинге" is **three** — `task`, `campaign` and `rule` are model-invocable because something calls them, and the other eight carry the flag (decision **0016**, criterion reworded by **0050**; `DESIGN.md §11`). D3's four types are **six**: `spike` and `upgrade` joined them, each with a decidable test, and `refactor` gained a `mechanical` shape (decision **0081**; `FORMATS.md §3`).

**D2.** Единственный вход — `/hodos:task <описание>`. Ноль скиллов в листинге модели (все `disable-model-invocation: true`).

**D3. Пути × типы.** Путь `quick / standard / deep`, тип `feature / bug / refactor / question`. Роутер **предлагает**, юзер решает. Защита от «роутер хочет быстрее»:
1. Бремя доказательства на лёгком пути: чек-лист «почему не deep» с evidence (файлы, контракты, зависимости); любой «не знаю» → тяжелее; пустой чек-лист = deep.
2. Храповик только вверх; апгрейд посреди задачи → `Upgrade:` в ledger.
3. `/status` показывает долю апгрейдов — метрика вместо веры.

Критерии `quick` (черновик, уточнятся на полигоне): ≤3 файла, нет нового модуля, нет изменения контракта/схемы/роута, нет новой зависимости, нет миграции данных.

Тип `bug` → план начинается с **red-loop**: команда, которая краснеет на этом баге, до любой гипотезы («нет красной команды — нет фазы 2»).

**Роутер → кампания** (F1, семантика, не строки), если хотя бы одно: не влезает в один MR без поломки main / потери ревьюабельности; >1 разработчик; есть туман; широкий рефакторинг со счётной метрикой; пересекает bounded contexts/сервисы/репо; внешние ожидания. Лимит строк плана — **только advisory-линт**.

Бюджет роутера: ≤5 тул-вызовов до вердикта. «Роутер, ушедший исследовать, — провалившийся роутер».

## 4. Сессии, фазы, модели

> **Superseded in part.** D5's model list lost two keys and gained three: there is no `models.triage` — the reviewer runs its own confidence pass — and no key for plan or execute, which run in the main session on the session's model; `planReview`, `preparer` and `initScan` were added (decisions **0003**, **0074**; `FORMATS.md §2`).

**D4. Две сессии.** S1 = `route → research → plan` (диалог, непрерывный контекст, заканчивается `plan.md` + апрувом + строкой `/clear` → `/hodos:run <slug>`). S2 = `execute → review → fix → verify → fix → finish`.

**Фазы — не скиллы.** `task` и `run` — ядра ≤150 строк (user-invoked), фазы — reference-файлы, читаются с диска **при входе в фазу** (fail-closed: не прочитался — стоп, не восстанавливать по памяти). После компакта ядро (≤5k токенов) живо, фаза перечитывается.

**Ревью и verify — свежие субагенты** (`agents/hodos-reviewer.md`, `agents/hodos-verifier.md`), **не** `context: fork` (форк наследует историю сессии — ровно то, чего нельзя). Получают только файлы: план, ledger, diff, правила проекта. Research — `Explore`.

**R4/K6. Развилки вне плана.** Меняет поведение / контракт / структуру / зависимость → **стоп, в чат**, варианты + рекомендация, ждёт; пишется `Gap:` в ledger (метрика качества плана). Чисто локальное (имя, порядок) → агент решает, `Ruling:` в ledger, виден в отчёте. Режим «rulings без человека» — `config.autonomy`, выключен.

**D5. Модели** (дефолты конфига): plan / execute / review — **opus**; research/explore — sonnet; verify — sonnet; triage-находок — haiku; init: сканеры sonnet, синтез opus. Execute на opus — код страдает первым.

## 5. Research

**R-1.** `deep` — обязательно; `standard` — когда грилинг упёрся в факт; `quick` — без фазы, один Explore при нужде.
Кто: Explore-субагенты (read-only, не плодят субагентов), sonnet, параллельно по вопросам, ответ ≤1.5k токенов: факты с `path:line` + **список файлов для чтения**, не пересказ.
Что: `research.md` — вопрос → ответ → цитаты (скрипт `verify-citations` проверяет строки); прецеденты (≥2 места); внешние API (либа → версия из lockfile → источник этой версии); риски; открытые вопросы для грилинга (research формулирует вопросы, не решает).
Правила: приоритет источников (код пакета → Context7 с версией → доки; WebSearch/WebFetch — разведка); отрицательный результат требует второго поиска другой формы.
**R-2.** `research.md` умирает с задачей; долгоживущее → правила или карта кампании. Отдельного `docs/` нет.

## 6. Планирование

**Грилинг** (Pocock, целиком): дерево решений → фронтир (вопросы с решёнными предпосылками) → раунды → каждый вопрос с рекомендованным ответом → факты добывает агент субагентами, решения — юзер → готово, когда фронтир пуст. Склеен с таблицей решений (§1 п.8).

**Design-секция плана — обязательные поля** (пустое = план не готов):
| Поле | Заставляет |
|---|---|
| Модули: затронутые / новые | новый модуль → обоснование, почему не существующий |
| Направление зависимостей | стрелки внутрь; нарушение → decision |
| Интерфейсы (сигнатуры) | deep modules: маленький интерфейс, большая функциональность |
| Инварианты и режимы отказа | что не ломается; что делаем, когда ломается |
| Данные и масштаб | объём, latency, горячие пути, N+1, unbounded — допущения записаны, ревьюер сверяет |
| Прецедент | как проект уже решает похожее (≥2 `file:line`); новый паттерн — только через decision |
| Попутный рефакторинг | что улучшить в **затронутом** коде (boy-scout в границах задачи) |
| Внешние API | либа / версия / источник |
| Альтернативы архитектуры | **K1:** 2–3 настоящих варианта от одного планировщика (design-it-twice минимум), таблица, выбор юзера. Никакого веера субагентов |
| Non-goals | что явно не делаем |

**Precedent-first**: обёртка допустима, только если добавляет границу абстракции, инвариант или перевод типов — иначе decision «зачем».
**Прототип**: throwaway-код на **один** вопрос дизайна, помечен, удаляется до execute; только когда грилинг упёрся в «не знаем, пока не попробуем».
**K2.** `deep` → ревью плана свежим субагентом до апрува (дыры, двусмысленности, конфликты с правилами; «approve unless serious gaps», read-only).
**Задачи** — tracer bullets (вертикальные срезы), у каждой: файлы, acceptance-критерий **до кода**, тест-стратегия (test-first для логики / после или verify для UI-склейки).
**Open questions** — пусто на апруве.

## 7. Execute

- Задача за задачей в основном контексте S2: acceptance → (test-first по плану) → код → прогон проверки задачи → **коммит на задачу** → `Task N: done (hash)` в ledger.
- **S1 коммиты:** эталонные с учётом проекта — init детектит конвенцию; реальная → следуем; вырожденная → дефолт engine (conventional, imperative, «почему» в теле), без co-author трейлеров.
- **S4.** Красная проверка не зеленеет **3 попытки** → стоп, в чат с диагнозом.
- Доказательство теста — **мутация** (сломай строку → тест краснеет).
- **K3.** Simplify-pass в конце execute по списку дефолтов → коммит.
- **K4. Список LLM-дефолтов** (reference execute + промпт ревьюера; позитивные формы; проектные правила добавляют своё):

| Дефолт | Механизм |
|---|---|
| анти-паттерн, который официальные доки фреймворка запрещают (`useEffect` везде) | правило из init (источник + прецедент); ревьюер |
| всё в один файл | design-секция «модули»; «новая ответственность = новый модуль» |
| не рефачит попутно, где дёшево | поле плана «попутный рефакторинг затронутого»; ревьюер: пропущенный дешёвый в затронутом — minor; правки вне затронутого — finding |
| нарушает архитектуру/конвенции | правила с прецедентами + precedent-first + Standards-ось, нарушение правила = major |
| угадывает API библиотек | «внешний факт — из источника»; поле плана; без источника план не готов |
| устаревшие версии из памяти | версия из lockfile → доки этой версии |
| рационализирует правила | рецепты без nuance-clauses; короткая red-flags таблица в ядре; хук там, где проверяемо (opt-in); `/finish` предлагает hookify при повторе |
| хелпер/обёртка с одним вызовом; абстракция без ≥2 потребителей | «хелпер имеет ≥2 вызова или инлайнится» |
| комментарий, пересказывающий код | комментарий — только неочевидный нюанс бизнес-логики |
| `try/catch`, глотающий ошибку; `?? default`, маскирующий баг | ошибка либо обрабатывается по инварианту плана, либо всплывает |
| `any`/каст; ослабленный assert ради зелёного | тип выводится или объявляется; мутация теста |
| переписанная утилита, которая есть в проекте | поиск прецедента обязателен |
| shims «на всякий», флаги, конфиги, которых не просили | non-goals плана; YAGNI конкретно |
| имена `data/utils/helper/manager/Enhanced*`; god-функции | имя называет роль; функция — одно действие |
| новая зависимость вместо 10 строк | зависимость — через decision |
| `TODO` вместо решения; мёртвый код | TODO → `Gap:` в чат; мёртвое удаляется в simplify |

## 8. Review

- **Один** свежий субагент, opus, read-only по дереву, **прогоняет тесты/тайпчек/линт** (команды из конфига) — падения = findings (S5). Ревью = статика + автоматика; verify = поведение.
- Вход через скрипт `review-package`: `review-input.md` (design-секция + задачи + `git diff base..HEAD`). Основной контекст diff не видит — читает вердикт и список.
- Промпт: «код написан другим агентом» — фактом, не ролью; отчёт исполнителя — показания, не evidence; рационализация не понижает severity; «не крутить кодовую базу — одна точечная проверка на названный риск»; не плодить субагентов.
- Отчёт `review.md`: вердикт · **Spec** (Missing / Extra / Misunderstood) · **Standards** (findings: severity `blocker/major/minor`, `file:line`, нарушенный пункт — правило / поле плана / конкретный дефект) · прогоны · **coverage** (что не смотрел). Finding без `file:line` и пункта выбрасывается; «выглядело бы чище» — не finding. ≤400 слов на ось.
- Итерация 1: blocker + major чинятся, minor — если дёшево; коммит → **scoped re-review** только по diff правок → итерация 2 → остались blocker'ы → **breaker (S2):** «принять с открытыми» / «продолжить вручную» / «откатить до задачи N».

## 9. Verify

- Свежий субагент, sonnet. Вход: acceptance-критерии плана + `config.verify` рецепт + адаптер браузера.
- **Iron Law**: нет свежего прогона в этом сообщении — нет заявления «работает». Таблица claim → команда → evidence (вывод / `evidence/*.png`) → статус. Каждый Skip — с причиной; выпавший из отчёта роут — названный провал.
- Границы: не повторяет в браузере то, что jsdom покрывает; браузер — для CSS/layout/каскада/анимаций/hover/breakpoints; логический баг из браузера → finding «+ покрыть тестом».
- Выборочная мутация тестов. Perf — если план объявил (K5).
- Порядок **review → verify** (S3). 2 итерации; правки verify **перепроверяются, не ревьюятся**; `/finish` их перечисляет.

## 10. Finish

- Отчёт в чат: сделано; `Gap:` (дыры плана); `Ruling:`; открытые minor; предложения правил — **только** если дефект вызван отсутствием конвенции и паттерн ≥2 раза в коде (1 раз → наблюдение в ledger); предложение хука при повторном нарушении правила.
- **C-4.** `review.md`/`verify.md` сворачиваются в секцию `Outcome` плана, файлы удаляются. Task-dir удаляется с подтверждения.
- Узел кампании → `done` + sha, done-метрика перемеряется.
- Ветка остаётся, push/merge — никогда.

## 11. Артефакты и форматы

> **Superseded in part.** `config.tasks.track` is **retired**: it validated and did nothing, and where a team's durable record lives is the commit body, the campaign node's `ref: sha:` and any rule a finding earned (decision **0079**; `DESIGN.md §5.1`). F-2's one writer holds and is stricter: the write goes through a temp file and a rename, and a ledger that cannot be read is a refusal rather than a state derived from zero events (decision **0101**).

`.claude/hodos/tasks/<slug>/` (**gitignored** по умолчанию, `config.tasks.track` для команд) — D6:

| Файл | Содержание | Пишет |
|---|---|---|
| `brief.md` | промпт дословно; вердикт роутера: путь, тип, чек-лист с evidence | роутер |
| `research.md` | §5 | research |
| `plan.md` | Goal · Non-goals · Decisions · Design (§6) · External APIs · Tasks · Verify plan · Open questions · (после finish) Outcome. Без frontmatter (F-3) | план |
| `ledger.md` | append-only: `Task N: started/done (hash)` · `Ruling:` · `Gap:` · `Review 1: verdict (b/m/m)` · `Fix 1: (hash)` · `Verify 1:` · `Upgrade:` · `Breaker:` · `Compact:` | **скрипт** |
| `state.json` | slug, path, type, phase, счётчики итераций, последний коммит, campaign node | **скрипт** |
| `review.md`, `verify.md` | §8, §9; удаляются в finish | субагенты |
| `evidence/` | скриншоты, выводы | verify |

**F-2.** Модель зовёт `node scripts/ledger.mjs add "…"` — один writer пишет и `ledger.md`, и `state.json`; хуки и `/status` читают только JSON. Модель ledger руками не правит.

`.claude/hodos/campaigns/<slug>.md` — **tracked**.

**Протухание:** `/status` и SessionStart-дайджест называют задачи старше `config.tasks.staleDays` (дефолт 14).

## 12. Кампании (D10 — ядро v1)

- **Узел = одна mergeable-единица** (ветка/MR), проглатывает `plan → execute → review → verify`. Карта про куски работы, не про фазы.
- **Создание:** роутер → «кампания» → грилинг уровня кампании: цель, done-метрики (команда → ожидаемое число), архитектурное направление D1..Dn (обязательны для узлов), декомпозиция (tracer bullets / expand–contract), туман → карта → первый узел фронтира → задача с `campaign: slug/node`.
- **Формат карты:** заголовок (цель, done-метрики с текущим значением, owners, трекер-ссылка) · Решения · Узлы одной строкой: `- [status] name — gist · deps · @owner · branch · task/sha · metric` · Ожидания (чего ждём, от кого).
- **C-1. Статусы:** `fog / ready / blocked / active / review / done / dropped`. Узлы-решения и узлы-research закрываются сессией грилинга/ресёрча → D-запись.
- **Инварианты:** индекс, не хранилище; один узел за сессию (кроме research/decision); **C-3** решения кампании меняются только через карту; фронтир пуст ≠ конец (назвать ожидание, предложить: пнуть / вытащить из тумана / вне скоупа); туман не режется заранее (тест: сформулировать вопрос сейчас, не ответить).
- **C-2.** Claim = `[active] … @owner` в ветке узла; гонки — социально в v1; адаптер трекера — позже.
- **M-1. Мульти-репо:** карта в home-репо; узел несёт `repo:` и `path:`; поиск карт: текущий проект → вверх до git-root → `config.campaigns.external[]`. Done-метрики с `repo:`. **M-2.** finish в чужом репо правит карту home и просит закоммитить; авто — opt-in.
- Закрытие: все узлы done/dropped + метрики + подтверждение → `status: done`, файл остаётся.

## 13. Init

**Три источника правил-кандидатов:** (1) прецеденты кода (≥2), (2) best practices стека из индекса источников engine (`sources/<stack>.md`, pointers; Context7/WebFetch на init), (3) наблюдения юзера («что Claude делает здесь не так»).
**Фильтр — 3 вопроса с evidence:** (а) код это соблюдает? → прецедент / drift-решение; (б) LLM это делает без правила? → список дефолтов + ответ юзера; (в) проверяемо механически? → хук/линт вместо прозы. Правило цитирует источник; `/finish` потом подтверждает или предлагает удалить.

**Шаги:** 0 инвентарь (git, манифесты, lockfile, CI, тест/линт-конфиги, workspaces, AI-инструкции, `.mcp.json`) → 1 скан Explore-субагентами по областям (стек и команды · архитектура · конвенции · тесты · инструкции), факты с `path:line` → 2 best practices → 3 интервью (recall-вопросы, батчи ≤8, не спрашивать то, что скан ответил; как запускать для verify; что не трогать; трекер/ветки/коммиты; язык) → 4 **отчёт до записи** (карта CLAUDE.md, правила с обоснованием и формой, config, **ledger миграции** существующих инструкций `retain/rewrite/relocate/automate/delete` с evidence и «что теряем», хуки opt-in, адаптеры) → 5 апрув batch, спорные правила по одному → 6 запись → 7 самопроверка (линт + **однократный прогон** команд рецепта, I-3; «проверено `<дата>`») → 8 ретирование старого по ledger'у с апрувом.
**I-1.** Существующий `CLAUDE.md` — managed-блок с маркерами + предложения трима; не переписываем. **I-2.** Правила — в `.claude/rules/` с `paths:`. **I-6.** Монорепо — nested `.claude/` на подпроект, конфиг корня + nested.
`/hodos:init --refresh` — протухшие прецеденты, drift, новые области (`git log --diff-filter=DR` с записанного SHA).

## 14. Конфиг `.claude/hodos/config.json`

> **Superseded.** The current field list is `FORMATS.md §2`. What moved: `verify.browser` is gone (the browser is selected by `adapters.browser`), `models` is the set above, `tasks.track` is retired, and `verify` gained `recipes[].kind` with five members plus the `profile`/`profiles`/`layers` environment stack (decisions **0003**, **0074**, **0079**, **0095**).

`version` · `language` · `stack[]` · `commands{test,typecheck,lint,build,dev{cmd,url,ready}}` · `verify{browser,recipes[]}` · `conventions{commit,branch}` · `models{plan,execute,review,verify,research,triage}` · `gates{blockCommitOnFailedReview,denyDangerousGit,stopHookLedger: false}` · `autonomy: "ask"` · `adapters{browser,codeIndex,tracker,design}` · `campaigns{external[]}` · `tasks{track:false,staleDays:14}` · `nested[]` · `verifiedAt`.

## 15. Хуки (H)

Все: `config.json` не найден → `exit 0`; fail-open; инцидент в шапке; exec-form с `${CLAUDE_PLUGIN_ROOT}`.

| Событие | Что | Режим |
|---|---|---|
| `SessionStart` startup/resume/clear | дайджест состояния ≤300 токенов (активные задачи, протухшие, фронтир счётчиками, `verifiedAt`), формулировка — состояние, не инструкция | advisory |
| `SessionStart` compact | путь к ledger активной задачи + «продолжай с последней открытой строки» | advisory |
| `PreCompact` | `Compact: <time>` в ledger | всегда |
| `PostToolUse` Write\|Edit на `.claude/**/*.md`, `SKILL.md` | линт: frontmatter, размеры, цитаты | advisory |
| `PreToolUse` Bash | deny `push --force`, `--no-verify`, `reset --hard`, `rm -rf` вне `tasks/`; `git commit` при FAIL-ревью. Разбор команды split'ом, не substring | **opt-in** |
| `Stop` | S2 с незакрытым ledger → блок с конкретным остатком | **opt-in** |
| `UserPromptSubmit` | ничего — стоит на каждый ход | — |

## 16. Токены и компакт (T)

> **Superseded in part.** "Ноль скиллов в листинге" is three (decision **0016**). T-1's polygon is **`ariadne_v2`**, not the internal monorepo T-1 named (decision **0021**), and the measurement is not `/cost`: `scripts/usage.mjs` sums a task's sessions from their transcripts and `status --cost` reports **token counts only**, because the price of a token is not in the transcript (decision **0045**; `DESIGN.md §11`).

**Лимиты (линт):** ядро ≤150 строк; reference ≤200; промпт агента ≤150; правило ≤100; `CLAUDE.md`-карта ≤60; `description` ≤500 символов; дайджест ≤300 токенов; ответ research ≤1.5k; отчёт ревью ≤400 слов на ось.
**Конструкция:** diff не в основном контексте; отчёты — файлы; ноль скиллов в листинге; research → списки файлов; один ревьюер; тиринг; ledger + `SessionStart(compact)` делают авто-компакт безопасным.
**T-1. Замер как acceptance v1:** на внутреннем монорепозитории по 5 задач `quick` и `standard` с hodos и без, `/cost`. Старт: `quick` ≤1.3× голого, `standard` ≤2× при лучшем ревью. Числа правит полигон.

## 17. Качество плагина (P)

> **Superseded in part.** The evaluation assets are `bench/`, not `evals/`, so the directory does not collide with `claude plugin eval`'s own `evals/**/case.yaml` (decision **0005**, confirmed by `PLATFORM-NOTES.md` fact 47); `P-1`'s fixtures are `bench/fixtures/` and there are four of them. P-3's polygon is `ariadne_v2` (decision **0021**); dogfooding from v0.2 is unchanged.

- `scripts/lint.mjs`: строгое подмножество YAML для frontmatter (вне подмножества — предупреждение); лимиты §16; reference — один уровень, у каждого есть ссылающееся ядро; агенты `hodos-*`; цитаты резолвятся; на проекте — то же для `.claude/rules`. + `claude plugin validate --strict` в CI.
- **Evals** (вручную/nightly): роутер (≈30 размеченных описаний → путь/тип, точность); ревьюер (fixture с посеянными дефектами → recall/precision); no-op тест спорных строк.
- **P-1.** `evals/fixtures/` — маленький React+TS фронт + node-бэкенд с конвенциями и тестами.
- Полигон — внутренний монорепозиторий. **P-3.** Dogfooding с v0.2.
- **P-4.** Политика PR: изменение формулировок скилла/правила — только с evidence; линт зелёный. `AUTHORING.md` — рубрика §1 п.14.
- Релизы: semver, CHANGELOG, тег → `marketplace.json` → `claude plugin update`.

## 18. Компоненты (превью для `COMPONENTS.md`)

| Тип | Имя | Роль |
|---|---|---|
| skill | `task` | ядро S1: роутер → research → грилинг/план → апрув → строка запуска S2 |
| skill | `run` | ядро S2: execute → review → fix → verify → fix → finish; resume по ledger |
| skill | `init` | §13 (+ `--refresh`) |
| skill | `status` | активные/протухшие задачи, фронтир кампаний, доля апгрейдов, линт `.claude` |
| skill | `campaign` | грилинг уровня кампании, карта, узлы (вызывается из `task` или напрямую) |
| skill | `rule`, `skill` | writers по рубрике с 3-вопросным тестом; регистрируют в карте |
| skill | `wait-what` | 7 строк, голосом юзера: «перескажи, где ты, простым языком» |
| reference | `route.md`, `research.md`, `plan.md`, `design.md`, `execute.md`, `defaults.md` (LLM-дефолты), `review-loop.md`, `verify-loop.md`, `finish.md`, `campaign-map.md` | фазы, fail-closed |
| agent | `hodos-reviewer` (opus), `hodos-verifier` (sonnet), `hodos-plan-reviewer` (opus, только deep) | свежий контекст |
| script | `ledger.mjs`, `review-package.mjs`, `verify-citations.mjs`, `lint.mjs`, `state-digest.mjs` (для SessionStart), `git-guard.mjs` (opt-in) | детерминизм |
| hooks | §15 | |
| adapters | `browser/chrome-devtools`, `codeIndex/ariadne`, `design/figma`, `tracker/youtrack` (стартовый набор из внутреннего монорепозитория) | |
| sources | `javascript.md`, `typescript.md`, `react.md`, `testing.md`, `dotnet.md`, … | pointers |

## 19. Числа-гипотезы (правит полигон)

250 строк плана (advisory) · 3 попытки на красную проверку · 2 итерации ревью + 2 verify · `staleDays` 14 · 1.3× / 2× · ≤5 тул-вызовов роутера · ≤8 вопросов в батче интервью · критерии `quick` (§3).

## 20. Что делаем дальше

> **Superseded.** This section is the process of the design phase. The process now is `DECISIONS.md`'s — a *Proposed* entry with options and a recommendation, the user's choice recorded as a numbered decision, nothing built from a proposal — and `STAGE-PROTOCOL.md`'s for how a stage runs (decision **0001**).

1. Ты перечитываешь этот свод; правки — прямо здесь или в чате.
2. После апрува — `docs/DESIGN.md`, `COMPONENTS.md` (спека каждого компонента с completion criteria и лимитами), `AUTHORING.md`, `BUILD-PLAN.md` (стадии с acceptance, полигон — внутренний монорепозиторий) — на английском.
3. Билд — Opus, по `BUILD-PLAN.md`; я — ревью стадий.
