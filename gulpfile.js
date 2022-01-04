const { src, dest, watch, series, parallel } = require("gulp");
const autofixer = require("gulp-autoprefixer");
const formatHtml = require("gulp-format-html");
const imagein = require("gulp-imagemin");
const concat = require('gulp-concat-util');
const uglify = require('gulp-uglify');
const uglifycss = require('gulp-uglifycss');
const sass = require("gulp-dart-sass");
const pug = require('gulp-pug');
const sync = require("browser-sync").create();

const { rollup } = require("rollup");
const { babel } = require("@rollup/plugin-babel");
const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const { default: imagemin } = require("imagemin");

const IS_RPOD = process.env.NODE_ENV === "production";

const babelPlugin = babel({
    babelHelpers: "bundled",
    exclude: [/node_module/],
    presets: [
        [
            "@babel/preset-env",
            { targets: ["defaults"], useBuiltIns: "usage", corejs: "3.6.5" },
        ],
    ],
});

let cache;

const html = () =>
    src("src/*.pug")
    .pipe(pug({
        pretty: true,
    }))
    .pipe(formatHtml())
    .pipe(dest("public"));
const css = () =>
    src("src/index.scss").pipe(sass()).pipe(autofixer()).pipe(uglifycss()).pipe(dest("public/css"));
const img = () => src("src/img/**/*").pipe(imagein()).pipe(dest("public/img"));
const copy = () =>
    src(["src/fonts/**", "src/videos/**"], {
        base: "src",
    }).pipe(dest("public"));
const libsjs = () => src(['src/js/_jquery.min.js', 'src/js/libs/*.js']).pipe(concat('main.min.js')).pipe(uglify()).pipe(dest('public/js/'))
const js = () =>
    rollup({
        input: "./src/index.js",
        plugins: [commonjs(), nodeResolve(), IS_RPOD && babelPlugin],
        cache,
    })
    .then((b) => ((cache = b.cache), b))
    .then((b) =>
        b.write({
            file: "public/js/index.js",
            format: "iife",
            sourcemap: IS_RPOD,
        })
    );

const watchTask = () => {
    sync.init({ notify: false, server: { baseDir: "public" } });
    watch("src/**/*.scss", css).on("change", sync.reload);
    watch("src/**/*.js", js).on("change", sync.reload);
    watch("src/**/*.pug", html).on("change", sync.reload);
    watch("src/img/**/*", img).on("change", sync.reload);
    watch(["src/fonts/**", "src/videos/**"], copy).on(
        "change",
        sync.reload
    );
};

const build = parallel(html, css, js, libsjs, img, copy);

exports.js = js;
exports.css = css;
exports.build = build;
exports.default = series(build, watchTask);