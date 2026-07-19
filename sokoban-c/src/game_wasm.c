#include <emscripten.h>
#include "game.h"
#include <stdbool.h>

/* ── Global game state (single instance) ──────────────────────── */
static Game   game;
static Level  levels[64];
static int    level_count = 0;
static int    current_idx = 0;
static bool   initialized = false;

/* ── Initialisation ───────────────────────────────────────────── */

EMSCRIPTEN_KEEPALIVE
bool wasm_init(void) {
    if (initialized) return true;
    level_count = levels_scan("levels", levels, 64);
    if (level_count == 0) return false;
    game_init(&game, &levels[0]);
    current_idx = 0;
    initialized = true;
    return true;
}

/* ── Level navigation ─────────────────────────────────────────── */

EMSCRIPTEN_KEEPALIVE
int wasm_level_count(void) { return level_count; }

EMSCRIPTEN_KEEPALIVE
const char *wasm_level_name(int idx) {
    if (idx < 0 || idx >= level_count) return "";
    return levels[idx].name;
}

EMSCRIPTEN_KEEPALIVE
bool wasm_load_level(int idx) {
    if (idx < 0 || idx >= level_count) return false;
    game_free(&game);
    game_init(&game, &levels[idx]);
    current_idx = idx;
    return true;
}

/* ── Board dimensions ─────────────────────────────────────────── */

EMSCRIPTEN_KEEPALIVE int wasm_rows(void) { return game.rows; }
EMSCRIPTEN_KEEPALIVE int wasm_cols(void) { return game.cols; }
EMSCRIPTEN_KEEPALIVE int wasm_moves(void) { return game.moves; }
EMSCRIPTEN_KEEPALIVE bool wasm_solved(void) { return game_is_solved(&game); }

/* ── Movement ─────────────────────────────────────────────────── */

EMSCRIPTEN_KEEPALIVE
bool wasm_step(int dr, int dc) {
    return game_step(&game, dr, dc);
}

EMSCRIPTEN_KEEPALIVE
void wasm_reset(void) {
    game_reset(&game);
}

/* ── Cell query (for rendering) ────────────────────────────────── */
/* Returns combined cell type:
   0 = floor    1 = wall      2 = target
   3 = player   4 = box       5 = box-on-target   */

EMSCRIPTEN_KEEPALIVE
int wasm_get_cell(int r, int c) {
    if (r < 0 || r >= game.rows || c < 0 || c >= game.cols) return 1;

    bool is_player = (r == game.player_r && c == game.player_c);

    /* Find box at this position */
    int box_idx = -1;
    for (int i = 0; i < game.num_boxes; i++) {
        if (game.box_r[i] == r && game.box_c[i] == c) {
            box_idx = i;
            break;
        }
    }

    if (is_player)          return 3;
    if (box_idx >= 0) {
        if (game.box_done[box_idx]) return 5;
        return 4;
    }
    if (game.fixed[r][c] == CELL_WALL)   return 1;
    if (game.fixed[r][c] == CELL_TARGET) return 2;
    return 0;
}
