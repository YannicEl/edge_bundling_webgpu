from experiments import Experiment
from sepb import SpannerBundlingFG
from collections import defaultdict
from reader import Reader
import os
from straight import StraightLine
import gc
from importedBundling import ImportedBundling

def main():
  G = Reader.readGraphML(f'../../core/src/datasets/graphml/airlines.graphml', invertY=False, directed=False)      

  #First create straight line drawing
  # straight = StraightLine(G)
  # straight.bundle()
  # straight.draw("./test/")

  bundling = SpannerBundlingFG(G)
  bundling.bundle()
  bundling.export("./test/bundling.json")
  bundling.draw("./test/")


  bundling = ImportedBundling("./test/bundling.json")
  bundling.draw("./test/")

  bundling = ImportedBundling("./test/bundling_real.json")
  bundling.draw("./test/")


if __name__ == "__main__":
  main()
