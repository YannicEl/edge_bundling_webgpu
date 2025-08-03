import networkx as nx
import sys
import numpy as np


class Reader:

    @staticmethod
    def readGraphML(path, invertX=False, invertY=False, G_width=1200, directed=False):

        G = nx.read_graphml(path)
        G.graph['Name'] = path.split('/')[-1]
        #G = nx.Graph(G)

        nx.convert_node_labels_to_integers(G, first_label=0, ordering='default', label_attribute=None)

        if not directed:
            G = nx.to_undirected(G)

        xmin = sys.maxsize
        xmax = -sys.maxsize - 1
        ymin = sys.maxsize
        ymax = -sys.maxsize - 1

        for n, data in G.nodes(data = True):
            if not ('x' in data and 'y' in data):
                print(f'Coordinate error in dataset {input}')
                return None

            else:
                x = float(data['x'])
                y = float(data['y'])
                
                data['X'] = x
                data['Y'] = y

                if x < xmin: xmin = x
                if y < ymin: ymin = y
                if x > xmax: xmax = x
                if y > ymax: ymax = y
            
        factor = G_width / (xmax - xmin)
        width = G_width
        height = (ymax - ymin) * factor

        for node, data in G.nodes().data():
            G.nodes()[node]['X'] = (data['X'] - xmin) * factor
            data['Y'] = (data['Y'] - ymin) * factor

            if invertX: G.nodes()[node]['X'] = width - data['X']
            if invertY: data['Y'] = height - data['Y']

        for (u,v,data) in G.edges(data = True):
            d1 = G.nodes[u]
            d2 = G.nodes[v]

            dx = d1['X'] - d2['X']
            dy = d1['Y'] - d2['Y']

            l = np.sqrt((dx)**2 + (dy)**2)

            data['dist'] = l

        G.graph['xmin'] = 0
        G.graph['xmax'] = G_width
        G.graph['ymin'] = 0
        G.graph['ymax'] = (ymax - ymin) * factor

        return G