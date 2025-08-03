import copy
import networkx as nx
import numpy as np
from scipy import signal
from PIL import Image
import pickle

GREY_THRESH = 255                       #Threshold when a pixel is considered as 'occupied'
ANGLE_THRESHOLD = 2 * np.pi * 10 / 360  #Angle threshold when two edges crossing are considered ambiguous
SCALEFACTOR = 0.25                      #Scale down input image for more efficient processing
AMBIGUITY_SP_CUTOFF = 5                 #Compute ambiguity up to a hop distance

class Experiment:

    def __init__(self, G, Straight):
        self.Straight = Straight.G
        self.G = G.G
        self.name = G.name


    def run(self, path):
        '''
        Calculate the metrics from the paper.
        '''
        ink = self.calcInkRatio(path)
        dist = self.calcDistortion()
        amb = self.calcAmbiguity(path)

   

        return ink, dist, amb

    def calcInkRatio(self, path):
        '''
        Calculate the ink ratio. Assumes that there is a .png with the investigated algorithm and a straight line drawing.
        '''

        imPath = path + 'straight' + '.png'
        imGray = np.array(Image.open(imPath).convert('L'))

        inkratioG = (imGray < GREY_THRESH).sum()

        imPath = path + self.name + '.png'
        imGray = np.array(Image.open(imPath).convert('L'))

        greyscalepixel = (imGray < GREY_THRESH).sum()
        inkratio = greyscalepixel / inkratioG

        return inkratio

    def calcDistortion(self):
        '''
        Calculate the distortion by summing up the polyline segments of the Bezier approximation.
        '''
        lPoly = 0
        lStraight = 0

        distortions = []

        for source, target, data in self.G.edges(data=True):
            X = data['X']
            Y = data['Y']

            x0 = self.G.nodes[source]['X']
            x1 = self.G.nodes[target]['X']
            y0 = self.G.nodes[source]['Y']
            y1 = self.G.nodes[target]['Y']

            lPoly = 0
            lStraight = np.sqrt(np.square(x0-x1) + np.square(y0-y1))    

            if len(X) <= 2:
                distortion = 1
                lPoly = lStraight
            else:
                for i in range(len(X) - 1):
                    x0 = X[i]
                    x1 = X[i + 1]
                    y0 = Y[i]
                    y1 = Y[i + 1]

                    lPoly += np.sqrt(np.square(x0-x1) + np.square(y0-y1))        

                distortion =  lPoly / lStraight

            distortions.append(distortion)

        return (np.min(distortions), np.mean(distortions), np.std(distortions), np.var(distortions), np.median(distortions))

    def calcAmbiguity(self, path):
        '''
        Calculate the ambiguity. Store intermediate results in the folder /pickle and reuse. Important if parameters for the ambiguity are changed then delete the files.
        '''
        try:
            edgeEdgeSet = pickle.load(open(f'{path}/pickle/{self.name}.ees', 'rb'))
            edgeSet = pickle.load(open(f'{path}/pickle/{self.name}.es', 'rb'))
            print(f'{self.name} pickle found, processing now')

            return self.ambiguityCalculation(edgeSet, edgeEdgeSet)
        except (OSError, IOError) as e:
            print('No pickle found, processing now')

            edgeSet, edgeEdgeSet = self.preprocessAmbiguity(path)

            return self.ambiguityCalculation(edgeSet, edgeEdgeSet)

    def ambiguityCalculation(self, edgeSetOrg, edgeEdgeSetOrg):
        '''
        Calculate the ambiguity by processing the ambiguous edges.
        '''
        edges = list(self.G.edges())
        trueEdges = dict()
        falseEdges = dict()
        reachable1 = dict()
        unreachable1 = dict()

        vDictUnreachable = dict()
        vDictReachable = dict()

        apsp = dict(nx.all_pairs_shortest_path_length(self.G))
        
        Ambiguities = []
        
        for cutoff in range(1, AMBIGUITY_SP_CUTOFF + 1):
            edgeSet = edgeSetOrg.copy()
            edgeEdgeSet = edgeEdgeSetOrg.copy()
        
            for n in self.G.nodes():
                vDictReachable[n] = set()
                vDictUnreachable[n] = set()

            '''
            Remove edges that are not ambiguous as the edge exists 
            '''
            for s1,t1,data in self.G.edges(data=True):
                toRemove = []

                trueEdges[(s1,t1)] = set()
                falseEdges[(s1,t1)] = set()
                for e in edgeEdgeSet[(s1,t1)]:
                    s2,t2 = edges[e]

                    if self.G.has_edge(s1,t2) and self.G.has_edge(t1,s2):
                        toRemove.append(e)
                        trueEdges[(s1,t1)].add(e)
                    elif self.G.has_edge(t1,t2) and self.G.has_edge(s1,s2):
                        toRemove.append(e)
                        trueEdges[(s1,t1)].add(e)
                    else:
                        falseEdges[(s1,t1)].add(e)

                trueEdges[(s1,t1)].add(-1)
                edgeEdgeSet[(s1,t1)].difference_update(toRemove)

                reachable1[(s1,t1)] = set()
                unreachable1[(s1,t1)] = set()
                for v in edgeSet[(s1,t1)]:
                    if v is s1:
                        continue
                    elif v in apsp[s1] and apsp[s1][v] <= cutoff:
                        reachable1[(s1,t1)].add(v)
                        vDictReachable[s1].add(v)
                    else:
                        unreachable1[(s1,t1)].add(v)
                        vDictUnreachable[s1].add(v)

                reachable1[(t1,s1)] = set()
                unreachable1[(t1,s1)] = set()
                for v in edgeSet[(t1,s1)]:
                    if v is t1:
                        continue
                    elif v in apsp[t1] and apsp[t1][v] <= cutoff:
                        reachable1[(t1,s1)].add(v)
                        vDictReachable[t1].add(v)
                    else:
                        unreachable1[(t1,s1)].add(v)
                        vDictUnreachable[t1].add(v)

                vDictReachable[t1].add(s1)
                vDictReachable[s1].add(t1)
                reachable1[(s1,t1)].add(t1)
                reachable1[(t1,s1)].add(s1)

            oben = 0
            unten = 0

            ambVAmbiguity = []
            for n in self.G.nodes():
                oben += len(vDictUnreachable[n])
                unten += len(vDictUnreachable[n]) + len(vDictReachable[n])

                lie1 = len(vDictUnreachable[n]) / (len(vDictUnreachable[n]) + len(vDictReachable[n]))

                ambVAmbiguity.append(lie1)

            Ambiguities.append(np.mean(ambVAmbiguity))
        
        return Ambiguities

    def preprocessAmbiguity(self, outPath):
        '''
        Compute which edges in the drawing are close and parallel or have a shallow crossing.
        '''

        G = self.copyAndScale(SCALEFACTOR)

        w1 = int(np.ceil(G.graph['xmax']))
        h1 = int(np.ceil(G.graph['ymax']))

        occup = np.zeros((w1 + 1,h1 + 1,len(G.edges())), dtype=np.int32)
        angle = np.zeros((w1 + 1,h1 + 1,len(G.edges())), dtype=np.float64)
        pixelpathLength = np.zeros(len(G.edges()))
        #print(occup.shape)

        z = 0
        for source, target, data in G.edges(data=True):
            X = data['X']
            Y = data['Y']

            path = []
        
            for i in range(len(X) - 1):
                x0 = X[i]
                x1 = X[i + 1]
                y0 = Y[i]
                y1 = Y[i + 1]

                l = int(np.ceil(np.sqrt(np.square(x0-x1) + np.square(y0-y1)) / 0.4))

                a = np.arctan2(y0 - y1, x0 - x1)
                
                if a < 0:
                    a = 2 * np.pi + a                   
    
                x = np.linspace(x0, x1, num=l)
                y = np.linspace(y0, y1, num=l)

                pX = np.empty_like(x)
                pY = np.empty_like(y)

                np.floor(x, pX)
                np.floor(y, pY)
                pX = pX.astype(int)
                pY = pY.astype(int)

                xOld = -1
                yOld = -1

                for j in range(l):
                    try:
                        if not (pX[j] == xOld and pY[j] == yOld ):
                            path.append((pX[j],pY[j]))
                            xOld = pX[j]
                            yOld = pY[j]

                            angle[pX[j]][pY[j]][z] = a
                            occup[pX[j]][pY[j]][z] = 1
                    except IndexError:
                        continue

            #print(len(path),path)
            data['Path'] = path
            pixelpathLength[z] = len(path) - 2
            z = z + 1

        kernel = np.ones((3,3))

        conv = occup
        aangle = angle

        pixelDict = dict()

        for z in range(len(occup[0][0])):
            arr = occup[:,:,z]
            arr = signal.convolve2d(arr, kernel, boundary='fill', mode='same')
            
            arr2 = angle[:,:,z]
            arr2 = signal.convolve2d(arr2, kernel,boundary='fill', mode='same')

            arr2[arr > 1] = arr2[arr > 1] / arr[arr > 1]        
            arr[arr > 1] = 1

            conv[:, :, z] = arr
            aangle[:,:,z] = arr2

        print('done Convolution')

        for id, data in G.nodes(data=True):
            x = int(data['X'])
            y = int(data['Y'])

            for xx in [-1,0,1]:
                for yy in [-1,0,1]:
                    try:
                        conv[x + xx, y + yy,:] = 0
                        aangle[x + xx, y + yy,:] = 0.0
                    except IndexError:
                        continue

        print('done removing vertices')

        for x in range(w1):
            for y in range(h1):
                l = []

                for z in range(len(occup[0][0])):
                    if conv[x][y][z]:
                        l.append(z)

                pixelDict[(x,y)] = l

        #amb = np.zeros((w1,h1))
        amb = np.zeros((w1,h1, len(G.edges())))

        print('done building structure')
        edgeAmbSet = dict()
        edgeEdgeAmbSet = dict()
        edges = list(G.edges())
        
        for s,t in G.edges():
            edgeEdgeAmbSet[(s,t)] = set()
            edgeAmbSet[(s,t)] = set()
            edgeAmbSet[(t,s)] = set()
            edgeAmbSet[(s,t)].add(t)
            edgeAmbSet[(t,s)].add(s)

        ambVal = np.zeros((len(G.edges()), len(G.edges())))
        ambEdge = np.zeros(len(G.edges()))

        for x in range(w1):
            for y in range(h1):
                lll = pixelDict[(x,y)]

                for i in range(len(lll)):
                    for j in range(i + 1, len(lll)):
                        e1 = lll[i]
                        e2 = lll[j]

                        a1 = aangle[x,y,e1]
                        a2 = aangle[x,y,e2]

                        a = np.mod(a1 - a2, 2 * np.pi)
                        aa = np.mod(a2 - a1, 2 * np.pi)
                        a = np.min([a, aa])
                        aTest = np.min([a, np.pi - a])

                        if aTest < ANGLE_THRESHOLD:
                            amb[x,y,z] += 1


                            ambEdge[e1] += 1
                            ambEdge[e2] += 1

                            ambVal[e1,e2] += 1
                            ambVal[e2,e1] += 1

                            s1,t1 = edges[e1]
                            s2,t2 = edges[e2]

                            edgeEdgeAmbSet[(s1,t1)].add(e2)
                            edgeEdgeAmbSet[(s2,t2)].add(e1)

                            if a < np.pi - a:
                                edgeAmbSet[(s1, t1)].add(t2)
                                edgeAmbSet[(t1, s1)].add(s2)
                                edgeAmbSet[(t2, s2)].add(s1)
                                edgeAmbSet[(s2, t2)].add(t1)
                            else:
                                edgeAmbSet[(s1, t1)].add(s2)
                                edgeAmbSet[(t1, s1)].add(t2)
                                edgeAmbSet[(t2, s2)].add(t1)
                                edgeAmbSet[(s2, t2)].add(s1)


        print('done calculating')
    
        pickle.dump(edgeEdgeAmbSet, open(f'{outPath}/pickle/{self.name}.ees', 'wb'))
        pickle.dump(edgeAmbSet, open(f'{outPath}/pickle/{self.name}.es', 'wb'))

        return edgeAmbSet, edgeEdgeAmbSet

    def copyAndScale(self, factor):
        '''
        Copy the graph and scale the position by factor. requires a graph with positive positions.

        G - Graph
        factor - scaling factor

        return
        G - Scaled and copied graph
        '''
        G = copy.deepcopy(self.G)

        for n, data in G.nodes(data=True):
            data['X'] = data['X'] * factor
            data['Y'] = data['Y'] * factor

        for t,s,data in G.edges(data=True):
            X = []
            Y = []

            for x in data['X']:
                X.append(x * factor)

            for y in data['Y']:
                Y.append(y * factor)

            data['X'] = X
            data['Y'] = Y
    
        G.graph['xmax'] = G.graph['xmax'] * factor
        G.graph['ymax'] = G.graph['ymax'] * factor

        return G