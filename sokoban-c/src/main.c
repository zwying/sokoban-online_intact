#define _GNU_SOURCE
#include "game.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <termios.h>
#include <signal.h>
#include <sys/ioctl.h>

/* ─── terminal raw-mode helpers ────────────────────────────────── */

static struct termios saved;

static void raw_enable(void) {
    tcgetattr(STDIN_FILENO, &saved);
    struct termios raw = saved;
    raw.c_lflag &= (tcflag_t) ~(ECHO | ICANON | ISIG);
    raw.c_cc[VMIN]  = 1;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

static void raw_disable(void) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &saved);
}

static void cleanup(void) {
    raw_disable();
    printf("\033[?25h");   /* show cursor */
    printf("\033[2J\033[H"); /* clear screen */
}

static void sig_handler(int sig) {
    (void)sig;
    cleanup();
    _exit(0);
}

/* Classic single-height rendering — each game row = 1 terminal row */
static void render(const Game *g, int current_lv, int total_lv) {
    printf("\033[H");   /* cursor home — no clear, less flicker */

    int rh = g->rows;
    int cw = g->cols;

    /* Title bar */
    printf("\033[1;37m┌─ Sokoban · 不眨眼 ───────────────────────────┐\033[0m\n");
    printf("\033[1;37m│\033[0m  Level: \033[1;33m%-36s\033[0m\033[1;37m│\033[0m\n", g->original.name);
    printf("\033[1;37m│\033[0m  Moves: \033[1;36m%-36d\033[0m\033[1;37m│\033[0m\n", g->moves);
    printf("\033[1;37m│\033[0m  #%d / %-32d\033[1;37m│\033[0m\n", current_lv + 1, total_lv);
    printf("\033[1;37m└──────────────────────────────────────────┘\033[0m\n\n");

    /* Legend */
    printf("  \033[1;31m@\033[0m=you  \033[1;33m$\033[0m=box  \033[1;32m$\033[0m=on-target  "
           "\033[1;37m#\033[0m=wall  \033[1;36m·\033[0m=target\n\n");

    /* Board */
    for (int r = 0; r < rh; r++) {
        printf("  ");
        for (int c = 0; c < cw; c++) {
            bool has_player = (r == g->player_r && c == g->player_c);
            int  bi = -1;
            for (int i = 0; i < g->num_boxes; i++)
                if (g->box_r[i] == r && g->box_c[i] == c) { bi = i; break; }

            if (has_player) {
                printf("\033[1;31m@\033[0m");
            } else if (bi >= 0 && g->box_done[bi]) {
                printf("\033[1;32m$\033[0m");
            } else if (bi >= 0) {
                printf("\033[1;33m$\033[0m");
            } else if (g->fixed[r][c] == CELL_WALL) {
                printf("\033[1;37m#\033[0m");
            } else if (g->fixed[r][c] == CELL_TARGET) {
                printf("\033[1;36m·\033[0m");
            } else {
                printf(" ");
            }
        }
        printf("\n");
    }

    /* Controls */
    printf("\n\033[2m  wasd/arrows=move  r=reset  n/p=level"
           "  1-9=jump  q=quit\033[0m\n");

    if (game_is_solved(g)) {
        printf("\n\033[1;32m  *** LEVEL COMPLETE!  Press 'n' for next. ***\033[0m\n");
    }

    fflush(stdout);
}

/* ─── input ────────────────────────────────────────────────────── */

#define K_UP    1001
#define K_DOWN  1002
#define K_RIGHT 1003
#define K_LEFT  1004

static int read_key(void) {
    int c = getchar();
    if (c != '\033') return c;

    /* Escape sequence — always try to read the full sequence.
       If user pressed lone ESC, getchar() for c2 simply blocks;
       they can press any key to unblock (or use 'q' to quit).    */
    int c2 = getchar();
    if (c2 == '[' || c2 == 'O') {
        int c3 = getchar();
        switch (c3) {
        case 'A': return K_UP;
        case 'B': return K_DOWN;
        case 'C': return K_RIGHT;
        case 'D': return K_LEFT;
        default:  return 0;    /* unrecognised — ignore */
        }
    }
    return 0;   /* unrecognised — ignore */
}

/* ─── main ─────────────────────────────────────────────────────── */

int main(int argc, char **argv) {
    const char *level_dir = "levels";
    if (argc > 1) level_dir = argv[1];

    /* Load levels */
    Level levels[256];
    int   lv_count = levels_scan(level_dir, levels, 256);

    if (lv_count == 0) {
        fprintf(stderr, "No .txt levels found in '%s'\n", level_dir);
        fprintf(stderr, "Usage: %s [levels_directory]\n", argv[0]);
        return 1;
    }

    /* Setup terminal */
    signal(SIGINT,  sig_handler);
    signal(SIGTERM, sig_handler);
    signal(SIGQUIT, sig_handler);
    raw_enable();
    atexit(cleanup);
    printf("\033[?25l");     /* hide cursor */
    printf("\033[2J\033[H"); /* clear */

    /* Init first level */
    int  cur = 0;
    Game game;
    game_init(&game, &levels[cur]);

    /* Main loop */
    int running = 1;
    render(&game, cur, lv_count);

    while (running) {
        int key = read_key();

        switch (key) {
        case 'w': case 'W': case K_UP:    game_step(&game, -1,  0); break;
        case 's': case 'S': case K_DOWN:  game_step(&game,  1,  0); break;
        case 'a': case 'A': case K_LEFT:  game_step(&game,  0, -1); break;
        case 'd': case 'D': case K_RIGHT: game_step(&game,  0,  1); break;

        case 'r': case 'R':
            game_reset(&game);
            break;

        case 'n': case 'N':
            if (cur + 1 < lv_count) {
                game_free(&game);
                cur++;
                game_init(&game, &levels[cur]);
            }
            break;

        case 'p': case 'P':
            if (cur > 0) {
                game_free(&game);
                cur--;
                game_init(&game, &levels[cur]);
            }
            break;

        case 'q': case 'Q':
            running = 0;
            break;

        /* Number keys: jump to level 1-9 */
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9': {
            int lv = key - '0' - 1;   /* 0-based */
            if (lv < lv_count) {
                game_free(&game);
                cur = lv;
                game_init(&game, &levels[cur]);
            }
            break;
        }
        }

        /* Auto-advance if solved and user pressed 'n' was already handled,
           but also allow ' ' (space) as a continuation key */
        if (key == ' ' && game_is_solved(&game) && cur + 1 < lv_count) {
            game_free(&game);
            cur++;
            game_init(&game, &levels[cur]);
        }

        render(&game, cur, lv_count);
    }

    game_free(&game);
    levels_free(levels, lv_count);
    return 0;
}
