import matplotlib
import numpy as np
from nx2ipe.nx2ipe import IpeConverter, SplineC
import matplotlib.pyplot as plt
import matplotlib.colors as clr
import scipy.interpolate as si
import cmcrameri as cmc
import networkx as nx
from abc import ABC, abstractmethod
import json

matplotlib.use('Agg')

### Plotting Parameters ###
LINEWIDTH = 1.5
LINE_COLOR = 'darkgrey'
ALPHA = 0.4
CIRCLE = 4.0
CIRCLE_COLOR = 'firebrick'
CIRCLE_SMALL = 2.0
CIRCLE_COLOR_LIGHT = 'darkslategrey'
BACKGROUND_COLOR = 'white'
DPI = 48
NUM_POINTS_BEZIER = 50

class AbstractBundling:
    '''
    Base class for implemented bundling algorithms. Handles drawing.
    '''
    def __init__(self, G : nx.Graph):
        self.G = G.copy()
        self.name = 'abstract'

        for (u, v, data) in G.edges(data=True):
            data['cp'] = []



    @abstractmethod
    def bundle(self):
        raise NotImplemented

    def colorEdges(self):
        '''
        Calculate the edge angle and color edges accordingly.
        '''
        for source, target, data in self.G.edges(data=True):
            x0 = self.G.nodes[source]['X']
            y0 = self.G.nodes[source]['Y']
            x1 = self.G.nodes[target]['X']
            y1 = self.G.nodes[target]['Y']

            x = x1 - x0
            y = y1 - y0

            angle = np.arctan2(y, x) * 180 / np.pi

            if angle < 0:
                angle = 360 + angle

            if self.G.is_directed():
                angle = angle / 360
            else:            
                if angle > 180:
                    angle = (angle + 180) % 360
                angle = angle / 180
            
            angle += 0.75
            if angle > 1:
                angle = angle - 1

            cmap = cmc.cm.romaO
            color = cmap(angle)

            data['Angle'] = angle
            data['Stroke'] = f"{color[0]} {color[1]} {color[2]}"

    def drawTrl(self, path):
        '''
        Create a file with trails of edges.
        '''
        with open(f'{path}{self.name}.trl', 'w') as f:
        
            i = 1
            for source, target, data in self.G.edges().data():
                if 'Spline' in data:
                    points = [(self.G.nodes[source]['X'], self.G.nodes[source]['Y'])] + data['Spline'].points + [(self.G.nodes[target]['X'], self.G.nodes[target]['Y'])]

                    X, Y = self.approxBezier(points, NUM_POINTS_BEZIER)
                else:
                    X = [self.G.nodes[source]['X'], self.G.nodes[target]['X']]
                    Y = [self.G.nodes[source]['Y'], self.G.nodes[target]['Y']]        
                    
                f.write(f"{i}: ")
                
                for i, x in enumerate(X):
                    y = Y[i]
                    f.write(f"{x:.4f} {y:.4f} ")
                f.write("\n")

    def draw(self, path, color=True, plotIpe=False, saveFile=True):
        '''
        Draw the bundling. Either using the assign color function or the coloring given by the bundling. if plotIpe is true, it will create an IPE drawing as well.
        '''
        nx.set_edge_attributes(self.G, '50%', name='Opacity')

        if color:
            self.colorEdges()

        if plotIpe:
            ipe = IpeConverter()
            ipe._options._DRAWING_UNBOUND = False
            ipe.createDrawing(self.G, f'{path}{self.name}.xml')

        fig, ax = plt.subplots(figsize=(self.G.graph['xmax'] / DPI, self.G.graph['ymax'] / DPI), dpi=DPI)
        ax.axis('off')
        # fig.canvas.set_window_title(self.name)

        cmap = cmc.cm.romaO

        for source, target, data in self.G.edges().data():
            if 'Spline' in data:
                points = [(self.G.nodes[source]['X'], self.G.nodes[source]['Y'])] + data['Spline'].points + [(self.G.nodes[target]['X'], self.G.nodes[target]['Y'])]

                X, Y = self.approxBezier(points, 50)
                data['X'] = X
                data['Y'] = Y
                ax.plot(X, Y, color=cmap(data['Angle']), alpha=ALPHA, lw = LINEWIDTH)
            else:
                X = [self.G.nodes[source]['X'], self.G.nodes[target]['X']]
                Y = [self.G.nodes[source]['Y'], self.G.nodes[target]['Y']]

            data['X'] = X
            data['Y'] = Y
            # ax.plot(X, Y, color=cmap(data['Angle']), alpha=ALPHA, lw = LINEWIDTH)

        X = []
        Y = []
        for id, data in self.G.nodes().data():
            X.append(data['X'])
            Y.append(data['Y'])

        # ax.plot(X, Y, linestyle="none", color=CIRCLE_COLOR_LIGHT, marker='.', markersize = CIRCLE)

        if saveFile:
            plt.savefig(f'{path}{self.name}.png')
        plt.close(fig)

    def approxBezier(self, points, n):
        X = []
        Y = []
        binom = {}

        for i, p in enumerate(points):
            binom[i] = self.binomial(len(points) - 1, i)
            i += 1

        for t in np.linspace(0, 1, n):
            pX = 0
            pY = 0


            for i, p in enumerate(points):
                tpi = np.power(1 - t, len(points) - 1 - i)
                coeff = tpi * np.power(t, i)

                pX += binom[i] * coeff * p[0]
                pY += binom[i] * coeff * p[1]

            X.append(pX)
            Y.append(pY)
        
        return X, Y


    def binomial(self, n, k):
        coeff = 1
        x = n - k + 1
        while x <= n:
            coeff *=x
            x += 1
        
        for x in range(1, k + 1): coeff /= x
        return coeff

    def export(self, file_path: str):
        '''
        Export the bundled graph to a JSON file that can be imported by ImportedBundling.
        
        The exported format includes:
        - nodes: list of [x, y] coordinates
        - node_ids: list of node IDs corresponding to the nodes list
        - edges: list of [u, v] pairs
        - splines: dictionary containing spline node indices instead of coordinates
        
        Args:
            file_path: Path to save the JSON file.
        
        Returns:
            None.
        '''
        
        # Prepare nodes data
        nodes = []
        node_ids = []
        for node_id, node_data in self.G.nodes(data=True):
            nodes.append([node_data['X'], node_data['Y']])
            node_ids.append(node_id)
        
        # Create mappings for efficient lookup
        node_id_to_index = {node_id: idx for idx, node_id in enumerate(node_ids)}
        coord_to_node_id = {}
        for node_id, node_data in self.G.nodes(data=True):
            coord_key = (node_data['X'], node_data['Y'])
            coord_to_node_id[coord_key] = node_id
        
        # Prepare edges data
        edges = []
        for u, v in self.G.edges():
            edges.append([u, v])
        
        splines = {}
        for u, v, data in self.G.edges(data=True):
            edge_key = f"{u},{v}"
            
            # Export spline if available, converting coordinates to node indices
            if 'Spline' in data and data['Spline'] is not None:
                # Convert spline points to node indices

                spline_node_indices = []
                for point in data['Spline'].points:
                    # Try direct coordinate lookup first
                    coord_key = (point[0], point[1])
                    if coord_key in coord_to_node_id:
                        node_id = coord_to_node_id[coord_key]
                        spline_node_indices.append(node_id_to_index[node_id])
                    else:
                        print("öpö")
                
                splines[edge_key] = spline_node_indices
        
        # Prepare complete data structure
        export_data = {
            'nodes': nodes,
            'node_ids': node_ids,
            'edges': edges,
            'splines': splines
        }
        
        # Add graph dimensions if available
        if hasattr(self.G, 'graph') and 'xmin' in self.G.graph:
            export_data['dimensions'] = {
                'xmin': self.G.graph['xmin'],
                'xmax': self.G.graph['xmax'],
                'ymin': self.G.graph['ymin'],
                'ymax': self.G.graph['ymax']
            }
        
        # Save to file if file_path is provided
        with open(file_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        return export_data
