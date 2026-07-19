#ifndef GAME_H
#define GAME_H

#include <stdbool.h>

#define MAX_BOXES   200
#define MAX_ROWS    100
#define MAX_COLS    200

/* ── Board cell types ──────────────────────────────────────────── */
typedef enum {
    CELL_FLOOR  = 0,
    CELL_WALL   = 1,
    CELL_TARGET = 2
} CellType;

/* ── Parsed level (text lines straight from file) ──────────────── */
typedef struct {
    char *name;         /* e.g. "prb_1" */
    char **lines;
    int   rows;
} Level;

/* ── Running game state ────────────────────────────────────────── */
typedef struct {
    /* Fixed board — walls, floors, targets (never changes during play) */
    CellType **fixed;
    int        rows, cols;

    /* Player */
    int  player_r, player_c;

    /* Boxes — parallel arrays */
    int  num_boxes;
    int  box_r[MAX_BOXES];
    int  box_c[MAX_BOXES];
    bool box_done[MAX_BOXES];   /* true if box already sits on a target */

    /* Tracking */
    int  moves;
    int  boxes_on_target;       /* how many boxes currently on target */
    int  total_targets;         /* total target cells on the board */

    /* For reset — keep the original layout text */
    Level original;
} Game;

/* ── Level I/O ─────────────────────────────────────────────────── */
int   levels_scan(const char *dir, Level *out, int max);
void  levels_free(Level *lv, int count);

/* ── Game lifecycle ────────────────────────────────────────────── */
bool  game_init(Game *g, const Level *lv);
void  game_free(Game *g);
void  game_reset(Game *g);

/* ── Movement ──────────────────────────────────────────────────── */
/* dr,dc ∈ {-1,0,1}  (e.g. -1,0 = up).  Returns true if move executed. */
bool  game_step(Game *g, int dr, int dc);

/* ── Win check ─────────────────────────────────────────────────── */
bool  game_is_solved(const Game *g);

#endif
