import { useEffect } from 'react';
import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import { splineKind } from '@kitware/vtk.js/Common/DataModel/Spline3D/Constants';

export default function SplineWidget() {
    useEffect(() => {
        // Standard rendering code setup
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
            background: [0, 0, 0],
        });
        const renderer = fullScreenRenderer.getRenderer();
        const renderWindow = fullScreenRenderer.getRenderWindow();
        const iStyle = vtkInteractorStyleImage.newInstance();
        renderWindow.getInteractor().setInteractorStyle(iStyle);

        // Widget manager
        const widgetManager = vtkWidgetManager.newInstance();
        widgetManager.setRenderer(renderer);
        const widget = vtkSplineWidget.newInstance();
        const widgetRepresentation = widgetManager.addWidget(widget);
        renderer.resetCamera();
    }, []);
    useEffect(() => {

    }, []);
    return (
        <div>
            <div></div>
            <table
                style={{
                    position: 'absolute',
                    top: '25px',
                    left: '25px',
                    background: 'white',
                    padding: '12px',
                }}
            >
                <tbody>
                    <tr>
                        <td>Kind</td>
                        <td></td>
                        <td>
                            <select class="kind">
                                <option value="kochanek">Kochanek</option>
                                <option value="cardinal">Cardinal</option>
                            </select>
                        </td>
                    </tr>
                    <tr></tr>
                    <tr>
                        <td>Tension</td>
                        <td></td>
                        <td>
                            <input class="tension" type="range" min="-1" max="1" step="0.1" value="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Bias</td>
                        <td></td>
                        <td>
                            <input class="bias" type="range" min="-1" max="1" step="0.1" value="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Continuity</td>
                        <td></td>
                        <td>
                            <input class="continuity" type="range" min="-1" max="1" step="0.1" value="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Resolution</td>
                        <td></td>
                        <td>
                            <input class="resolution" type="range" min="1" max="32" step="1" value="20"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Handles size</td>
                        <td></td>
                        <td>
                            <input class="handleSize" type="range" min="10" max="50" step="1" value="20"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Drag (freehand)</td>
                        <td>
                            <input class="allowFreehand" type="checkbox" checked="checked"/>
                        </td>
                        <td>
                            <input class="freehandDistance" type="range" min="0.05" max="1.0" step="0.05" value="0.2"/>
                        </td>
                    </tr>
                    <tr>
                        <td>Closed spline</td>
                        <td></td>
                        <td>
                            <input class="close" type="checkbox" checked="checked"/>
                        </td>
                    </tr> 
                    <tr> 
                        <td>Boundary conditions</td> 
                        <td></td> 
                        <td> 
                            <select class="boundaryCondition" disabled=""> 
                                <option value="0">default</option> 
                                <option value="1">derivative</option> 
                                <option value="2">2nd derivative</option> 
                                <option value="3">2nd derivative interior point</option> 
                            </select> 
                        </td> 
                    </tr> 
                    <tr> 
                        <td>Boundary Condition value X</td>
                        <td></td> 
                        <td> 
                            <input class="boundaryConditionValueX" type="range" min="-2" max="2" step="0.1" value="0" disabled=""/> 
                        </td> 
                    </tr> 
                    <tr> 
                        <td>Boundary Condition value Y</td> 
                        <td></td> 
                        <td> 
                            <input class="boundaryConditionValueY" type="range" min="-2" max="2" step="0.1" value="0" disabled=""/> 
                        </td> 
                    </tr>  
                    <tr> </tr>
                    <tr> 
                        <td>Border</td> 
                        <td></td> 
                        <td> 
                            <input class="border" type="checkbox" checked="checked"/> 
                        </td> 
                    </tr> 
                    <tr> 
                        <td> <button class="placeWidget">Place Widget</button> </td> 
                    </tr> 
                </tbody>
            </table>
        </div>
    );
}