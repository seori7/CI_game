/**
 * Служебный скрипт сборки: компилирует .ink-исходники из src/ink-source
 * в рантайм-JSON (формат Ink JSON Runtime v21) с помощью inkjs (full build,
 * включающего компилятор). Результат кладётся в src/dialogue/stories/*.ink.json
 * и импортируется в DialogueScene статически (bundler-friendly для Vite).
 *
 * Если под рукой есть Inky (https://github.com/inkle/inky) или inklecate —
 * можно скомпилировать .ink в JSON и ими, положив результат в то же место;
 * формат файла идентичен.
 *
 * Запуск: node scripts/compile-ink.cjs
 */
const fs = require('fs');
const path = require('path');
const inkjs = require('inkjs/full');

const SOURCE_DIR = path.resolve(__dirname, '../src/ink-source');
const OUTPUT_DIR = path.resolve(__dirname, '../src/dialogue/stories');

/** Список исходных .ink-файлов, которые нужно скомпилировать. */
const storyFiles = ['max.ink', 'nastya.ink', 'lena.ink'];

function compileAll() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const fileName of storyFiles) {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const inkSource = fs.readFileSync(sourcePath, 'utf-8').replace(/^\uFEFF/, '');

    const errors = [];
    const compiler = new inkjs.Compiler(inkSource, {
      errorHandler: (message, errorType) => {
        errors.push(`[${errorType}] ${message}`);
      },
    });

    const story = compiler.Compile();

    if (errors.length > 0) {
      console.error(`Ошибки компиляции ${fileName}:\n${errors.join('\n')}`);
      process.exitCode = 1;
      continue;
    }

    const json = story.ToJson();
    const outputFileName = fileName.replace(/\.ink$/, '.ink.json');
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`Скомпилировано: ${fileName} -> ${path.relative(process.cwd(), outputPath)}`);
  }
}

compileAll();
