import {useEffect, useRef, useState} from 'react';
import '@kitware/vtk.js/favicon';
// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageReslice from '@kitware/vtk.js/Imaging/Core/ImageReslice';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkResliceCursorWidget from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import { CaptureOn } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import { vec3 } from 'gl-matrix';
import { SlabMode } from '@kitware/vtk.js/Imaging/Core/ImageReslice/Constants';

import { xyzToViewType } from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants';
// Force the loading of HttpDataAccessHelper to support gzip decompression
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import {Checkbox, Select, Slider, Button} from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
const { Option } = Select;
import 'antd/dist/antd.less';

export default function ResliceCursorWidget() {
    // Define main attributes
    const viewColors = [
        [1, 0, 0], // sagittal
        [0, 1, 0], // coronal
        [0, 0, 1], // axial
        [0.5, 0.5, 0.5], // 3D
    ];
    const viewAttributes = [];
    const widget = vtkResliceCursorWidget.newInstance();
    const widgetState = widget.getWidgetState();
    widgetState.setKeepOrthogonality(true);
    widgetState.setOpacity(0.6);
    // Use devicePixelRatio in order to have the same display handle size on all devices
    widgetState.setSphereRadius(10 * window.devicePixelRatio);
    widgetState.setLineThickness(5);
    const initialPlanesState = { ...widgetState.getPlanes() };
    let view3D = null;
    const showDebugActors = true;
    // Define html structure
    const controlContainer = useRef(null);
    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    const [slabNumberMax, setSlabNumberMax] = useState(385.69547573182655);
    const [checkboxOrthogality, setCheckboxOrthogality] = useState(true);
    const [checkboxRotation, setCheckboxRotation] = useState(true);
    const [checkboxTranslation, setCheckboxTranslation] = useState(true);
    const [checkboxScaleInPixels, setCheckboxScaleInPixels] = useState(true);
    const [slabMode, setSlabMode] = useState('2');
    const [slabNumber, setSlabNumber] = useState(1);
    const [selectInterpolation, setSelectInterpolation] = useState(0);

    const createRGBStringFromRGBValues = (rgb) => {
        if (rgb.length !== 3) {
            return 'rgb(0, 0, 0)';
        }
        return `rgb(${(rgb[0] * 255).toString()}, ${(rgb[1] * 255).toString()}, ${(
            rgb[2] * 255
        ).toString()})`;
    };
    const updateReslice = (
        interactionContext = {
            viewType: '',
            reslice: null,
            actor: null,
            renderer: null,
            resetFocalPoint: false, // Reset the focal point to the center of the display image
            keepFocalPointPosition: false, // Defines if the focal point position is kepts (same display distance from reslice cursor center)
            computeFocalPointOffset: false, // Defines if the display offset between reslice center and focal point has to be
            // computed. If so, then this offset will be used to keep the focal point position during rotation.
            spheres: null,
        }
    ) => {
        const obj = widget.updateReslicePlane(interactionContext.reslice, interactionContext.viewType);
        if (obj.modified) {
            // Get returned modified from setter to know if we have to render
            interactionContext.actor.setUserMatrix(
                interactionContext.reslice.getResliceAxes()
            );
            interactionContext.sphereSources[0].setCenter(...obj.origin);
            interactionContext.sphereSources[1].setCenter(...obj.point1);
            interactionContext.sphereSources[2].setCenter(...obj.point2);
        }
        widget.updateCameraPoints(
            interactionContext.renderer,
            interactionContext.viewType,
            interactionContext.resetFocalPoint,
            interactionContext.keepFocalPointPosition,
            interactionContext.computeFocalPointOffset
        );
        debugger
        view3D.renderWindow.render();
        return obj.modified;
    };
    const renderContainer = () => {
        const container = document.getElementById('container');
        for (let i = 0; i < 4; i++) {
            const element = document.createElement('div');
            // element.setAttribute('class', 'view');
            element.style.width = '50%';
            element.style.height = '300px';
            element.style.display = 'inline-block';
            container.appendChild(element);
          
            const grw = vtkGenericRenderWindow.newInstance();
            grw.setContainer(element);
            grw.resize();
            const obj = {
              renderWindow: grw.getRenderWindow(),
              renderer: grw.getRenderer(),
              GLWindow: grw.getOpenGLRenderWindow(),
              interactor: grw.getInteractor(),
              widgetManager: vtkWidgetManager.newInstance(),
              orientationWidget: null,
            };
          
            obj.renderer.getActiveCamera().setParallelProjection(true);
            obj.renderer.setBackground(...viewColors[i]);
            obj.renderWindow.addRenderer(obj.renderer);
            obj.renderWindow.addView(obj.GLWindow);
            obj.renderWindow.setInteractor(obj.interactor);
            obj.interactor.setView(obj.GLWindow);
            obj.interactor.initialize();
            obj.interactor.bindEvents(element);
            obj.widgetManager.setRenderer(obj.renderer);
            if (i < 3) {
              obj.interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());
              obj.widgetInstance = obj.widgetManager.addWidget(widget, xyzToViewType[i]);
              obj.widgetInstance.setScaleInPixels(true);
              obj.widgetInstance.setRotationHandlePosition(0.75);
              obj.widgetManager.enablePicking();
              // Use to update all renderers buffer when actors are moved
              obj.widgetManager.setCaptureOn(CaptureOn.MOUSE_MOVE);
            } else {
              obj.interactor.setInteractorStyle(
                vtkInteractorStyleTrackballCamera.newInstance()
              );
            }
          
            obj.reslice = vtkImageReslice.newInstance();
            obj.reslice.setSlabMode(SlabMode.MEAN);
            obj.reslice.setSlabNumberOfSlices(1);
            obj.reslice.setTransformInputSampling(false);
            obj.reslice.setAutoCropOutput(true);
            obj.reslice.setOutputDimensionality(2);
            obj.resliceMapper = vtkImageMapper.newInstance();
            obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());
            obj.resliceActor = vtkImageSlice.newInstance();
            obj.resliceActor.setMapper(obj.resliceMapper);
            obj.sphereActors = [];
            obj.sphereSources = [];
          
            // Create sphere for each 2D views which will be displayed in 3D
            // Define origin, point1 and point2 of the plane used to reslice the volume
            for (let j = 0; j < 3; j++) {
              const sphere = vtkSphereSource.newInstance();
              sphere.setRadius(10);
              const mapper = vtkMapper.newInstance();
              mapper.setInputConnection(sphere.getOutputPort());
              const actor = vtkActor.newInstance();
              actor.setMapper(mapper);
              actor.getProperty().setColor(...viewColors[i]);
              actor.setVisibility(showDebugActors);
              obj.sphereActors.push(actor);
              obj.sphereSources.push(sphere);
            }
          
            if (i < 3) {
              viewAttributes.push(obj);
            } else {
              view3D = obj;
            }
          
            // create axes
            const axes = vtkAnnotatedCubeActor.newInstance();
            axes.setDefaultStyle({
              text: '+X',
              fontStyle: 'bold',
              fontFamily: 'Arial',
              fontColor: 'black',
              fontSizeScale: (res) => res / 2,
              faceColor: createRGBStringFromRGBValues(viewColors[0]),
              faceRotation: 0,
              edgeThickness: 0.1,
              edgeColor: 'black',
              resolution: 400,
            });
            // axes.setXPlusFaceProperty({ text: '+X' });
            axes.setXMinusFaceProperty({
              text: '-X',
              faceColor: createRGBStringFromRGBValues(viewColors[0]),
              faceRotation: 90,
              fontStyle: 'italic',
            });
            axes.setYPlusFaceProperty({
              text: '+Y',
              faceColor: createRGBStringFromRGBValues(viewColors[1]),
              fontSizeScale: (res) => res / 4,
            });
            axes.setYMinusFaceProperty({
              text: '-Y',
              faceColor: createRGBStringFromRGBValues(viewColors[1]),
              fontColor: 'white',
            });
            axes.setZPlusFaceProperty({
              text: '+Z',
              faceColor: createRGBStringFromRGBValues(viewColors[2]),
            });
            axes.setZMinusFaceProperty({
              text: '-Z',
              faceColor: createRGBStringFromRGBValues(viewColors[2]),
              faceRotation: 45,
            });
          
            // create orientation widget
            obj.orientationWidget = vtkOrientationMarkerWidget.newInstance({
              actor: axes,
              interactor: obj.renderWindow.getInteractor(),
            });
            obj.orientationWidget.setEnabled(true);
            obj.orientationWidget.setViewportCorner(
              vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
            );
            obj.orientationWidget.setViewportSize(0.15);
            obj.orientationWidget.setMinPixelSize(100);
            obj.orientationWidget.setMaxPixelSize(300);
        }
    };
    const loadImage = () => {
        reader.setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti').then(() => {
            reader.loadData().then(() => {
                const image = reader.getOutputData();
                widget.setImage(image);
                // Create image outline in 3D view
                const outline = vtkOutlineFilter.newInstance();
                outline.setInputData(image);
                const outlineMapper = vtkMapper.newInstance();
                outlineMapper.setInputData(outline.getOutputData());
                const outlineActor = vtkActor.newInstance();
                outlineActor.setMapper(outlineMapper);
                view3D.renderer.addActor(outlineActor);

                viewAttributes.forEach((obj, i) => {
                    obj.reslice.setInputData(image);
                    obj.renderer.addActor(obj.resliceActor);
                    view3D.renderer.addActor(obj.resliceActor);
                    obj.sphereActors.forEach((actor) => {
                      obj.renderer.addActor(actor);
                      view3D.renderer.addActor(actor);
                    });
                    const reslice = obj.reslice;
                    const viewType = xyzToViewType[i];
              
                    viewAttributes
                      // No need to update plane nor refresh when interaction
                      // is on current view. Plane can't be changed with interaction on current
                      // view. Refreshs happen automatically with `animation`.
                      // Note: Need to refresh also the current view because of adding the mouse wheel
                      // to change slicer
                    .forEach((v) => {
                        // Interactions in other views may change current plane
                        v.widgetInstance.onInteractionEvent(
                            // computeFocalPointOffset: Boolean which defines if the offset between focal point and
                            // reslice cursor display center has to be recomputed (while translation is applied)
                            // canUpdateFocalPoint: Boolean which defines if the focal point can be updated because
                            // the current interaction is a rotation
                            ({ computeFocalPointOffset, canUpdateFocalPoint }) => {
                            const activeViewType = widget
                                .getWidgetState()
                                .getActiveViewType();
                            const keepFocalPointPosition =
                                activeViewType !== viewType && canUpdateFocalPoint;
                            updateReslice({
                                viewType,
                                reslice,
                                actor: obj.resliceActor,
                                renderer: obj.renderer,
                                resetFocalPoint: false,
                                keepFocalPointPosition,
                                computeFocalPointOffset,
                                sphereSources: obj.sphereSources,
                            });
                            }
                        );
                    });
              
                    updateReslice({
                      viewType,
                      reslice,
                      actor: obj.resliceActor,
                      renderer: obj.renderer,
                      resetFocalPoint: true, // At first initilization, center the focal point to the image center
                      keepFocalPointPosition: false, // Don't update the focal point as we already set it to the center of the image
                      computeFocalPointOffset: true, // Allow to compute the current offset between display reslice center and display focal point
                      sphereSources: obj.sphereSources,
                    });
                    obj.interactor.render();
                });
              
                view3D.renderer.resetCamera();
                view3D.renderer.resetCameraClippingRange();

                // set max number of slices to slider.
                const maxNumberOfSlices = vec3.length(image.getDimensions());
                // todo
                // document.getElementById('slabNumber').max = maxNumberOfSlices;
                setSlabNumberMax(maxNumberOfSlices);
            });
        });
    };
    const updateViews = () => {
        viewAttributes.forEach((obj, i) => {
            updateReslice({
              viewType: xyzToViewType[i],
              reslice: obj.reslice,
              actor: obj.resliceActor,
              renderer: obj.renderer,
              resetFocalPoint: true,
              keepFocalPointPosition: false,
              computeFocalPointOffset: true,
              sphereSources: obj.sphereSources,
              resetViewUp: true,
            });
            obj.renderWindow.render();
        });
        if (view3D) {
            view3D.renderer.resetCamera();
            view3D.renderer.resetCameraClippingRange();
        }
    };
    const checkboxOrthogalityHandle = (e: CheckboxChangeEvent) => {
        console.log(e.target.checked);
        widgetState.setKeepOrthogonality(e.target.checked);
        setCheckboxOrthogality(e.target.checked);
    };
    const checkboxRotationHandle = (e: CheckboxChangeEvent) => {
        console.log(e.target.checked);
        widgetState.setEnableRotation(e.target.checked);
        setCheckboxRotation(e.target.value);
    };
    const checkboxTranslationHandle = (e: CheckboxChangeEvent) => {
        console.log(e.target.checked);
        widgetState.setEnableTranslation(e.target.checked);
        setCheckboxTranslation(e.target.value);
    };
    const checkboxScaleInPixelsHandle = (e: CheckboxChangeEvent) => {
        console.log(e.target.checked);
        viewAttributes.forEach((obj) => {
            obj.widgetInstance.setScaleInPixels(e.target.checked);
            obj.interactor.render();
        });
        setCheckboxScaleInPixels(e.target.value);
    };
    const slabModeHandle = (value: string) => {
        console.log(value);
        viewAttributes.forEach((obj) => {
            obj.reslice.setSlabMode(Number(value));
        });
        setSlabMode(value);
        updateViews();
    };
    const slabNumberHandle = (value: number) => {
        console.log(value);
        viewAttributes.forEach((obj) => {
            obj.reslice.setSlabNumberOfSlices(value);
        });
        setSlabNumber(value);
        updateViews();
    };
    const selectInterpolationHandle = (value: number) => {
        console.log(value);
        viewAttributes.forEach((obj) => {
            obj.reslice.setInterpolationMode(Number(value));
        });
        setSelectInterpolation(Number(value));
        updateViews();
    };
    const buttonResetHandle = () => {
        widgetState.setPlanes({ ...initialPlanesState });
        widget.setCenter(widget.getWidgetState().getImage().getCenter());
        updateViews();
    };
    useEffect(() => {
        renderContainer();
        loadImage();
    }, [])
    return (
        <div id="container">
            <div ref={controlContainer}>
                <Checkbox checked={checkboxOrthogality} onChange={checkboxOrthogalityHandle}>Keep orthogonality</Checkbox>
                <Checkbox checked={checkboxRotation} onChange={checkboxRotationHandle}>Allow rotation</Checkbox>
                <Checkbox checked={checkboxTranslation} onChange={checkboxTranslationHandle}>Allow translation</Checkbox>
                <Checkbox checked={checkboxScaleInPixels} onChange={checkboxScaleInPixelsHandle}>Scale in pixels</Checkbox>
                <Select value={slabMode} onChange={slabModeHandle}>
                    <Option value="0">MIN</Option>
                    <Option value="1">MAX</Option>
                    <Option value="2">MEAN</Option>
                    <Option value="3">SUM</Option>
                </Select>
                <span>Slab Number of Slices :</span>
                <Slider value={slabNumber} step={1} min={1} max={slabNumberMax} onChange={slabNumberHandle} style={{width: '100px', display: 'inline-block'}}/>
                <Select value={selectInterpolation} onChange={selectInterpolationHandle}>
                    <Option value={0}>Nearest</Option>
                    <Option value={1}>Linear</Option>
                </Select>
                <Button onClick={buttonResetHandle} type="primary">Reset views</Button>
            </div>
        </div>
    );
};