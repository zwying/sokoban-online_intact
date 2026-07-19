CC      ?= gcc
CFLAGS  += -Wall -Wextra -O2 -std=gnu11
TARGET  := sokoban
SRCDIR  := src
OBJDIR  := obj

SRCS := $(wildcard $(SRCDIR)/*.c)
OBJS := $(patsubst $(SRCDIR)/%.c, $(OBJDIR)/%.o, $(SRCS))

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

$(OBJDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -c -o $@ $<

$(OBJDIR):
	mkdir -p $(OBJDIR)

clean:
	rm -rf $(OBJDIR) $(TARGET)

run: $(TARGET)
	./$(TARGET) ./levels

# ── WebAssembly target ──────────────────────────────────
EMCC := emcc
WASM_SRCS := $(SRCDIR)/game_wasm.c $(SRCDIR)/game.c
WASM_OUT  := ../sokoban_wasm.js

wasm:
	$(EMCC) $(WASM_SRCS) -I $(SRCDIR) -O2 \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS='["_wasm_init","_wasm_level_count","_wasm_level_name","_wasm_load_level","_wasm_rows","_wasm_cols","_wasm_moves","_wasm_solved","_wasm_get_cell","_wasm_step","_wasm_reset","_malloc","_free"]' \
		-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
		--preload-file levels@/levels \
		-o $(WASM_OUT)

wasm-clean:
	rm -f $(WASM_OUT) $(WASM_OUT:.js=.wasm) $(WASM_OUT:.js=.data)
