SRC_DIR = src
DIST_DIR = dist
TEST_DIR = test
MAIN_FILE = main
SFILE = $(SFILE)
PFILE = $(PFILE)
COMPILER_FILE = compiled

TSC = tsc
TSC_OPTIONS = 

NODE = node

default: build run metabuild metarun

build:
	$(TSC) --outDir $(DIST_DIR) $(SRC_DIR)/$(MAIN_FILE).ts

run:
	$(NODE) $(DIST_DIR)/$(MAIN_FILE).js $(TEST_DIR)/$(SFILE)

metabuild:
	$(TSC) $(DIST_DIR)/$(COMPILER_FILE).ts

metarun:
	$(NODE) $(DIST_DIR)/$(COMPILER_FILE).js $(TEST_DIR)/$(PFILE)
