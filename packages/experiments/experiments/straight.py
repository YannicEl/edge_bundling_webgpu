from abstractBundling import AbstractBundling
import networkx as nx
import numpy as np

class StraightLine(AbstractBundling):
    '''
    Class to compute a straight line drawing. Additionally, if you call bundle() it will print some stats of the graph.
    '''

    def __init__(self, G: nx.Graph):
        super().__init__(G)
        self.name = 'straight'

    def bundle(self):

        n = len(self.G.nodes())
        m = len(self.G.edges())

        if nx.is_directed(self.G):
            GG = self.G.to_undirected(as_view=True)
            components = nx.biconnected_components(GG)
        else:
            components = nx.biconnected_components(self.G)

        i = 0
        s2 = 0
        s = []
        ss = []
        

        for nodes in components:
            if len(nodes) > 2:
                G = self.G.subgraph(nodes).copy()
                
                s.append(len(nodes))
                ss.append(len(G.edges()))
                
                for u,v in G.edges():
                    self.G[u][v]['Layer'] = str(i)
                i += 1  
            else:
                G = self.G.subgraph(nodes).copy()
                
                for u,v in G.edges():
                    self.G[u][v]['Layer'] = 'sec'
                    
                s2 += 1
     
        print(f'Graph has {n} nodes and {m} edges', flush=True)
        print(f'Graph has {i} components of size > two', flush=True)
        print(f'Components of size two {s2}', flush=True)
        print(f'Largest component has {max(s)} nodes', flush=True)
        print(f'Median size of component of size > two is {np.median(s)}')
        
        #print(f'Other components are of size {{{s}}} with {{{ss}}} edges', flush=True)


        return

            