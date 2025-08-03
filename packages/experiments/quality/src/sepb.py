from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from abstractBundling import AbstractBundling
from heapq import heappush, heappop
from itertools import count
import networkx as nx
import numpy as np
from nx2ipe.nx2ipe import SplineC
import time


class SpannerBundling(AbstractBundling):
    '''
    S-EPB. Implementation
    
    weightFactor: kappa value that sets the bundling strength
    distortion: t value that sets the maximum allowed stretch/distortion
    numWorkers: number of workers that process biconnected components 
    '''

    def __init__(self, G: nx.Graph, weightFactor = 2, distortion = 2, numWorkers=1):
        super().__init__(G)
        self.distortion = distortion
        self.weightFactor = weightFactor
        self.mode = "greedy"
        self.name = None
        self.numWorkers = numWorkers

    @property
    def name(self):
        return f'SEPB_d_{self.distortion}_w_{self.weightFactor}_{self.mode}'

    @name.setter
    def name(self, value):
        self._name = value

    '''
    Bundle the graph. 
    
    return the time needed for bundling.
    '''
    def bundle(self):
        
        t = time.process_time()
        
        if nx.is_directed(self.G):
            GG = self.G.to_undirected(as_view=True)
            components = nx.biconnected_components(GG)
        else:
            components = nx.biconnected_components(self.G)

        toProcess = []
        for nodes in components:
            if len(nodes) > 2:
                G = self.G.subgraph(nodes).copy()
                toProcess.append(G)


        toProcess = sorted(toProcess, key= lambda x : len(x.nodes()), reverse=True)
        with ThreadPoolExecutor(max_workers=self.numWorkers) as executor:
            for g in toProcess:
                executor.submit(self.process, (g))

        t2 = time.process_time() - t
        
        return t2

    '''
    Process a component. This works with either the whole graph or a single biconnected component.
    '''
    def process(self, component):

        T = self.spanner(component, self.distortion)

        for u,v,data in T.edges(data=True):
            data['weight'] = np.power(data['dist'], self.weightFactor)

        for u,v in T.edges():
            self.G[u][v]['Layer'] = 'Spanning'
            self.G[u][v]['Stroke'] = 'blue'


        nx.set_edge_attributes(self.G, False, 'Locked')

        neighbors = defaultdict(list)

        for u,v in component.edges():
            if T.has_edge(u,v) :
                continue     
            else:
                neighbors[u].append(v)       

        for u, toProcess in neighbors.items():
            
            if len(toProcess) == 1:
                paths = {toProcess[0]: nx.dijkstra_path(T, u, toProcess[0], weight="weight")}
            elif len(toProcess) > 1:
                paths = nx.single_source_dijkstra_path(T, u, weight='weight')
                
            for v in toProcess:               

                path = paths[v]
                dist = component[u][v]['dist']

                current = path[0]
                length = 0
                flag = False

                for next in path[1:]:
                    length += component[current][next]['dist']
                    
                    if length > self.distortion * dist:
                        flag = True
                        break
                    current = next

                if flag:
                    self.G[u][v]['Layer'] = 'Distorted'
                    self.G[u][v]['Stroke'] = 'brown'
                    continue

                spline = []
                current = path[0]
                for next in path[1:-1]:
                    x = component.nodes[next]['X']
                    y = component.nodes[next]['Y']

                    spline.append((x,y))
                    current = next

                self.G[u][v]['Spline'] = SplineC(spline)
                self.G[u][v]['Layer'] = 'Bundled'
                self.G[u][v]['Stroke'] = 'purple'
                self.G[u][v]['Locked'] = True
        return

    '''
    Create a spanner and return it.
    '''
    def spanner(self, g, k):
        if nx.is_directed(g):
            spanner = nx.DiGraph()
        else:
            spanner = nx.Graph()
        
        edges = sorted(g.edges(data=True), key=lambda t: t[2].get('dist', 1))

        for u,v,data in edges:
            if u not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue
            if v not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue

            try:
                pathLength = nx.dijkstra_path_length(spanner, u, v, weight='dist')

            except nx.NetworkXNoPath:
                pathLength = np.inf

            if pathLength > k * data['dist']:
                spanner.add_edge(u,v, dist=data['dist'])

        return spanner


class SpannerBundlingFG(SpannerBundling):
    '''
    S-EPB with fg-greedy algorithm.
    '''

    def __init__(self, G: nx.Graph, weightFactor = 2, distortion = 2):
        super().__init__(G)
        self.distortion = distortion
        self.weightFactor = weightFactor
        self.mode = 'fg_greedy'

    def spanner(self, g, k):
        if nx.is_directed(g):
            directed = True
            spanner = nx.DiGraph()
        else:
            directed = False
            spanner = nx.Graph()
        
        edges = sorted(g.edges(data=True), key=lambda t: t[2].get('dist', 1))
        weights = defaultdict(dict)

        for u,v,data in edges:
            if u not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue
            if v not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue

            if v in weights[u]:
                pathLength = weights[u][v]

                if pathLength <= k * data['dist']:
                    continue

            pathLengths = nx.single_source_dijkstra_path_length(spanner, u, weight='dist', cutoff= k * data['dist'])

            for key, pL in pathLengths.items():
                weights[u][key] = pL
                if not directed:
                    weights[key][u] = pL

            if v in weights[u]:
                pathLength = weights[u][v]
            else:
                pathLength = np.inf

            if pathLength > k * data['dist']:
                spanner.add_edge(u,v, dist=data['dist'])

        return spanner



class SpannerBundlingAStar(SpannerBundling):
    '''
    S-EPB with greedy spanner algorithm using the A* shortest path algorithm.
    '''

    def __init__(self, G: nx.Graph, weightFactor = 2, distortion = 2):
        super().__init__(G)
        self.distortion = distortion
        self.weightFactor = weightFactor
        self.mode = 'AStar'

    def spanner(self, g, k):
        spanner = nx.Graph()
        edges = sorted(g.edges(data=True), key=lambda t: t[2].get('dist', 1))

        #precompute the pair-wise distances.
        oracle = defaultdict(dict)

        for u, uD in g.nodes(data=True):
            for v, vD in g.nodes(data=True):
                oracle[u][v] = np.sqrt((uD['X'] - vD['X'])**2 + (uD['Y'] - vD['Y'])**2)

        def heuristic(a, b):
            return oracle[a][b]

        for u,v,data in edges:
            if u not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue
            if v not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue

            try:
                
                pathLength = nx.astar_path_length(spanner, u, v, heuristic=heuristic, weight='dist')

            except nx.NetworkXNoPath:
                pathLength = np.inf

            if pathLength > k * data['dist']:
                spanner.add_edge(u,v, dist=data['dist'])

        return spanner


    


class SpannerBundlingNoSP(SpannerBundling):
    '''
    S-EPB where instead of computing single source shortest paths we reuse shortest paths during the spanner construction. 
    '''

    def __init__(self, G: nx.Graph, weightFactor = 2, distortion = 2):
        super().__init__(G)
        self.distortion = distortion
        self.weightFactor = weightFactor
        self.mode = 'reuse'

    def process(self, component):

        T = self.spanner(component, self.distortion)

        for u,v,data in T.edges(data=True):
            data['weight'] = np.power(data['dist'], self.weightFactor)

        for u,v in T.edges():
            self.G[u][v]['Layer'] = 'Spanning'
            self.G[u][v]['Stroke'] = 'blue'

        for u,v,data in component.edges(data=True):

            if T.has_edge(u,v):
                continue

            path = data['path']

            if len(path) < 1:
                continue

            spline = []
            current = path[0]
            for next in path[1:-1]:
                x = component.nodes[next]['X']
                y = component.nodes[next]['Y']

                spline.append((x,y))
                current = next

            self.G[u][v]['Spline'] = SplineC(spline)
            self.G[u][v]['Layer'] = 'Bundled'
            self.G[u][v]['Stroke'] = 'purple'

        return

    '''
    Create a spanner and store the shortest path when an edge is rejected. 
    '''
    def spanner(self, g, k):
        if nx.is_directed(g):
            spanner = nx.DiGraph()
        else:
            spanner = nx.Graph()
        edges = sorted(g.edges(data=True), key=lambda t: t[2].get('dist', 1))

        for u,v,data in edges:
            if u not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue
            if v not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'])
                continue


            pred, pathLength = nx.dijkstra_predecessor_and_distance(spanner, u, weight='dist', cutoff=k * data['dist'])

            if v in pathLength:
                
                path = []
                next = v
                while next != u:
                    path.append(next)
                    next = pred[next][0]

                path = path[1:]
                path.reverse()

                data['path'] = path
            else:
                spanner.add_edge(u,v, dist=data['dist'])

        return spanner


class SpannerBundlingNoSPWithWF(SpannerBundling):
    '''
    Spanner bundling where we reuse paths during the shortest path computation, but use an adapted Dijkstra algorithm to explore nodes by their kappa weighted edge length.  
    '''

    def __init__(self, G: nx.Graph, weightFactor = 2, distortion = 2):
        super().__init__(G)
        self.distortion = distortion
        self.weightFactor = weightFactor
        self.mode = 'reuse_plus_kappa'
        
        
    def process(self, component):

        for u,v,data in component.edges(data=True):
            data['weight'] = np.power(data['dist'], 1)

        T = self.spanner(component, self.distortion)

        for u,v in T.edges():
            self.G[u][v]['Layer'] = 'Spanning'
            self.G[u][v]['Stroke'] = 'blue'

        edges = sorted(component.edges(data=True), key=lambda t: t[2].get('dist', 1), reverse=True)
        for u,v,data in edges:

            if T.has_edge(u,v):
                continue

            path = component[u][v]['path']
            path.reverse()
            
            ppath = [u] + path + [v]

            current = ppath[0]
            length = 0
            flag = False

            for next in ppath[1:]:
                length += component[current][next]['dist']
                
                if length > self.distortion * data['dist']:
                    flag = True
                    break
                current = next

            if flag:
                self.G[u][v]['Layer'] = 'Distorted'
                self.G[u][v]['Stroke'] = 'brown'
                continue

            spline = []

            for node in path:
                x = component.nodes[node]['X']
                y = component.nodes[node]['Y']

                spline.append((x,y))

            self.G[u][v]['Spline'] = SplineC(spline)
            self.G[u][v]['Layer'] = 'Bundled'
            self.G[u][v]['Stroke'] = 'purple'

        return

    def spanner(self, g, k):
        '''
        Spanner funktion that computes a spanner with adapted shortest path algorithm (Dijkstra).
        '''
        if nx.is_directed(g):
            spanner = nx.DiGraph()
        else:
            spanner = nx.Graph()
        edges = sorted(g.edges(data=True), key=lambda t: t[2].get('dist', 1))

        for u,v,data in edges:
            if u not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'], weight=data['weight'])
                continue
            if v not in spanner.nodes:
                spanner.add_edge(u,v, dist=data['dist'], weight=data['weight'])
                continue


            pathLength, path = self.dijkstra(spanner, u, v, k * data['dist'])

            if pathLength > k * data['dist']:
                spanner.add_edge(u,v, dist=data['dist'], weight=data['weight'])
            else:
                g[u][v]['path'] = path

        return spanner

    def dijkstra(self, G, source, target, distortion):
        '''
        Dijkstra algorithm from networkX adapted to use two different cost metrics.
        '''
        G_succ = G._succ if G.is_directed() else G._adj
        
        push = heappush
        pop = heappop
        
        dist_WF = {}  # dictionary of final distances
        dist_E = {}
        seen = {}
        paths = None
        pred = {}
        # fringe is heapq with 3-tuples (distance,c,node)
        # use the count c to avoid comparing nodes (may not be able to)
        c = count()
        fringe = []

        seen[source] = 0
        push(fringe, (0, 0, next(c), source))
        
        while fringe:
            (d, euc, _, v) = pop(fringe)
            if v in dist_WF:
                continue  # already searched this node.
            dist_WF[v] = d
            dist_E[v] = euc
            if v == target:
                break
            for u, e in G_succ[v].items():
                cost = G[v][u]['weight']
                dist = G[v][u]['dist']
                
                if cost is None:
                    continue
                
                vu_weight = dist_WF[v] + cost
                vu_dist = dist_E[v] + dist
                
                if vu_dist > distortion:
                    continue
                # if cutoff is not None:
                #     if vu_dist > cutoff:
                #         continue
                if u in dist_WF:
                    u_dist_wf = dist_WF[u]
                    if vu_weight < u_dist_wf:
                        raise ValueError("Contradictory paths found:", "negative weights?")
                    elif pred is not None and vu_weight == u_dist_wf:
                        pred[u] = v
                elif u not in seen or vu_weight < seen[u]:
                    seen[u] = vu_weight
                    push(fringe, (vu_weight, 0, next(c), u))
                    if paths is not None:
                        paths[u] = paths[v] + [u]
                    if pred is not None:
                        pred[u] = v
                elif vu_weight == seen[u]:
                    if pred is not None:
                        pred[u] = v

        # The optional predecessor and path dictionaries can be accessed
        # by the caller via the pred and paths objects passed as arguments.
        if target in dist_WF:
            n = pred[target]
            path = []
            while n is not source:
                path.append(n)
                n = pred[n]
            return dist_WF[target], path
        else:
            return np.inf, None


