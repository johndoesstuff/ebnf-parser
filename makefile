SRC_DIR = src
DIST_DIR = dist
TEST_DIR = test
MAIN_FILE = main
FILE = $(FILE)

TSC = tsc
TSC_OPTIONS = 

NODE = node

default: build run

build:
	$(TSC)

run:
	$(NODE) $(DIST_DIR)/$(MAIN_FILE).js $(TEST_DIR)/$(FILE)
