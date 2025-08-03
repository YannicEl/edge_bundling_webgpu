from experiments import Experiment
from sepb import SpannerBundlingFG, SpannerBundlingNoSPWithWF, SpannerBundlingNoSP
from importedBundling import ImportedBundling
from collections import defaultdict
from reader import Reader
import os
from straight import StraightLine
import gc

def effectivenessExperiments(base, dataset, algorithm, invertY):
    G = Reader.readGraphML(f'../../core/src/datasets/graphml/{dataset}.graphml', G_width=1600, invertY=invertY, directed=False)      
    
    outPath = f'{base}/output/{dataset}/'
    if not os.path.exists(outPath):
        os.makedirs(outPath)

    if not os.path.exists(outPath + 'pickle/'):
        os.makedirs(outPath + 'pickle/')

    #First create straight line drawing
    straight = StraightLine(G)
    straight.bundle()
    straight.draw(outPath)

    bundling = algorithm(G)
    bundling.bundle()
    bundling.draw(outPath)

    exp = Experiment(bundling, straight)
    return exp.run(outPath)

def effectivenessExperiments2(base, dataset, algorithm, invertY):
    G = Reader.readGraphML(f'../../core/src/datasets/graphml/{dataset}.graphml', G_width=1600, invertY=invertY, directed=False)      
    
    outPath = f'{base}/output/{dataset}/'
    if not os.path.exists(outPath):
        os.makedirs(outPath)

    if not os.path.exists(outPath + 'pickle/'):
        os.makedirs(outPath + 'pickle/')

    #First create straight line drawing
    straight = StraightLine(G)
    straight.bundle()
    straight.draw(outPath)

    bundling = ImportedBundling(f'test/bundling.json')
    bundling.draw(outPath)

    exp = Experiment(bundling, straight)
    return exp.run(outPath)

def main():
    base = "."
    datasets = [('airlines', True)]
    # datasets = [('airlines', True), ('migration', False), ('airtraffic', False)]
    algorithms = [StraightLine,  SpannerBundlingFG]

    results = []
    for dataset, invertY in datasets:
        for algorithm in algorithms:
            ink, dist, amb = effectivenessExperiments(base, dataset, algorithm, invertY)

            results.append({
              'dataset': dataset,
              'algorithm': algorithm.__name__,
              'ink': ink,
              'dist': dist,
              'amb': amb
            })

            # ink, dist, amb = effectivenessExperiments2(base, dataset, algorithm, invertY)
            # results.append({
            #   'dataset': dataset,
            #   'algorithm': algorithm.__name__ + ' (imported)',
            #   'ink': ink,
            #   'dist': dist,
            #   'amb': amb
            # })

    for result in results:
      print("--------------------------------")
      print(f'{result["dataset"]} {result["algorithm"]}')
      print("--------------------------------")
      print('')

      ink = result['ink']
      print(f'Ink reduction: {ink}')
      print('')

      dist = result['dist']
      print(f'Distortion:')
      print(f'mean: {dist[1]}')
      print(f'median: {dist[2]}')
      print('')

      amb = result['amb']
      print(f'Ambiguity:')
      print(f'1δ: {amb[0]}')
      print(f'2δ: {amb[1]}')
      print(f'3δ: {amb[2]}')
      print(f'4δ: {amb[3]}')
      print(f'5δ: {amb[4]}')
      print('')

if __name__ == "__main__":
    main()
