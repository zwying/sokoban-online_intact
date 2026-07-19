#include "game.h"

#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ─── helpers ──────────────────────────────────────────────────── */

static int str_cmp(const void *a, const void *b) {
    return strcmp(*(const char **)a, *(const char **)b);
}

/* ─── level scanning ───────────────────────────────────────────── */

int levels_scan(const char *dir, Level *out, int max) {
    DIR *d = opendir(dir);
    if (!d) return 0;

    /* collect .txt filenames */
    char *names[1024];
    int   n = 0;
    struct dirent *ent;
    while ((ent = readdir(d)) && n < 1024) {
        const char *nm = ent->d_name;
        size_t len = strlen(nm);
        if (len < 5) continue;                    /* too short for x.txt */
        if (strcmp(nm + len - 4, ".txt") != 0) continue;
        names[n++] = strdup(nm);
    }
    closedir(d);

    if (n == 0) return 0;

    /* sort so prb_1 < prb_2 < ... < prb_10 */
    qsort(names, n, sizeof(char *), str_cmp);

    int count = 0;
    for (int i = 0; i < n && count < max; i++) {
        char path[1024];
        snprintf(path, sizeof(path), "%s/%s", dir, names[i]);

        FILE *f = fopen(path, "r");
        if (!f) { free(names[i]); continue; }

        /* read all lines */
        char *lines[128];
        int   rows = 0;
        char  buf[256];
        while (fgets(buf, sizeof(buf), f) && rows < 128) {
            size_t bl = strlen(buf);
            /* strip trailing newline */
            while (bl > 0 && (buf[bl - 1] == '\n' || buf[bl - 1] == '\r'))
                buf[--bl] = '\0';
            lines[rows++] = strdup(buf);
        }
        fclose(f);

        if (rows == 0) { free(names[i]); continue; }

        /* Build Level */
        Level *lv = &out[count];
        /* name = filename minus ".txt" */
        size_t name_len = strlen(names[i]) - 4;
        lv->name = malloc(name_len + 1);
        memcpy(lv->name, names[i], name_len);
        lv->name[name_len] = '\0';

        lv->rows = rows;
        lv->lines = malloc((size_t)rows * sizeof(char *));
        for (int r = 0; r < rows; r++)
            lv->lines[r] = lines[r];

        count++;
        free(names[i]);
    }

    /* free remaining names */
    for (int i = count; i < n; i++) free(names[i]);
    return count;
}

void levels_free(Level *lv, int count) {
    for (int i = 0; i < count; i++) {
        free(lv[i].name);
        for (int r = 0; r < lv[i].rows; r++) free(lv[i].lines[r]);
        free(lv[i].lines);
    }
}

/* ─── game init / free / reset ─────────────────────────────────── */

bool game_init(Game *g, const Level *lv) {
    memset(g, 0, sizeof(*g));

    /* save original for reset */
    g->original.name = strdup(lv->name);
    g->original.rows = lv->rows;
    g->original.lines = malloc((size_t)lv->rows * sizeof(char *));
    for (int r = 0; r < lv->rows; r++)
        g->original.lines[r] = strdup(lv->lines[r]);

    /* ── parse the level ──────────────────────────────────────── */

    /* 1. determine dimensions — pad shorter rows with '#' */
    int max_cols = 0;
    for (int r = 0; r < lv->rows; r++) {
        int w = (int)strlen(lv->lines[r]);
        if (w > max_cols) max_cols = w;
    }

    g->rows = lv->rows;
    g->cols = max_cols;

    /* 2. allocate fixed board */
    g->fixed = malloc((size_t)g->rows * sizeof(CellType *));
    for (int r = 0; r < g->rows; r++)
        g->fixed[r] = calloc((size_t)g->cols, sizeof(CellType));

    /* 3. scan every char */
    g->num_boxes       = 0;
    g->boxes_on_target = 0;
    g->total_targets   = 0;
    g->moves           = 0;

    for (int r = 0; r < g->rows; r++) {
        const char *line = lv->lines[r];
        int linelen = (int)strlen(line);
        for (int c = 0; c < g->cols; c++) {
            char ch = (c < linelen) ? line[c] : '#';

            switch (ch) {
            case ' ':  /* floor */
                g->fixed[r][c] = CELL_FLOOR;
                break;
            case '#':  /* wall */
                g->fixed[r][c] = CELL_WALL;
                break;
            case '.':  /* target */
                g->fixed[r][c] = CELL_TARGET;
                g->total_targets++;
                break;
            case '&':  /* player on floor */
                g->fixed[r][c]     = CELL_FLOOR;
                g->player_r        = r;
                g->player_c        = c;
                break;
            case 'B':  /* box on floor */
                g->fixed[r][c] = CELL_FLOOR;
                g->box_r[g->num_boxes] = r;
                g->box_c[g->num_boxes] = c;
                g->box_done[g->num_boxes] = false;
                g->num_boxes++;
                break;
            case 'X':  /* box on target */
                g->fixed[r][c] = CELL_TARGET;
                g->total_targets++;
                g->box_r[g->num_boxes] = r;
                g->box_c[g->num_boxes] = c;
                g->box_done[g->num_boxes] = true;
                g->num_boxes++;
                g->boxes_on_target++;
                break;
            default:
                g->fixed[r][c] = CELL_FLOOR;
                break;
            }
        }
    }

    return true;
}

void game_free(Game *g) {
    free(g->original.name);
    for (int r = 0; r < g->original.rows; r++)
        free(g->original.lines[r]);
    free(g->original.lines);

    for (int r = 0; r < g->rows; r++)
        free(g->fixed[r]);
    free(g->fixed);

    memset(g, 0, sizeof(*g));
}

void game_reset(Game *g) {
    game_free(g);
    game_init(g, &g->original);
}

/* ─── movement ─────────────────────────────────────────────────── */

static int find_box_at(const Game *g, int r, int c) {
    for (int i = 0; i < g->num_boxes; i++)
        if (g->box_r[i] == r && g->box_c[i] == c)
            return i;
    return -1;
}

bool game_step(Game *g, int dr, int dc) {
    if (game_is_solved(g)) return false;

    int nr = g->player_r + dr;
    int nc = g->player_c + dc;

    /* Out of bounds? */
    if (nr < 0 || nr >= g->rows || nc < 0 || nc >= g->cols) return false;

    /* Wall? */
    if (g->fixed[nr][nc] == CELL_WALL) return false;

    int push_idx = find_box_at(g, nr, nc);

    if (push_idx >= 0) {
        /* Heading into a box — can we push it? */
        int br = nr + dr;
        int bc = nc + dc;

        /* New box position: out of bounds? */
        if (br < 0 || br >= g->rows || bc < 0 || bc >= g->cols) return false;
        /* New box position: wall? */
        if (g->fixed[br][bc] == CELL_WALL) return false;
        /* New box position: another box? */
        if (find_box_at(g, br, bc) >= 0) return false;

        /* Update box-on-target counters */
        bool was_on = g->box_done[push_idx];
        bool now_on = (g->fixed[br][bc] == CELL_TARGET);

        g->box_done[push_idx] = now_on;
        if (!was_on && now_on)  g->boxes_on_target++;
        if (was_on  && !now_on) g->boxes_on_target--;

        g->box_r[push_idx] = br;
        g->box_c[push_idx] = bc;
    }

    /* Move player */
    g->player_r = nr;
    g->player_c = nc;
    g->moves++;
    return true;
}

/* ─── win check ────────────────────────────────────────────────── */

bool game_is_solved(const Game *g) {
    return g->boxes_on_target == g->total_targets;
}
