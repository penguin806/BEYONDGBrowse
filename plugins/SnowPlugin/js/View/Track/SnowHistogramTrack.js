// Track that draws histogram
// Snow 2019-01-30

define( [
        'dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/mouse',
        'dojo/dom-construct',
        'dojo/Deferred',
        'dojo/on',
        'JBrowse/has',
        'JBrowse/Util',
        'JBrowse/View/GranularRectLayout',
        'JBrowse/View/Track/BlockBased',
        'JBrowse/View/Track/_ExportMixin',
        'JBrowse/Errors',
        'JBrowse/View/Track/_FeatureDetailMixin',
        'JBrowse/View/Track/_FeatureContextMenusMixin',
        'JBrowse/View/Track/_YScaleMixin',
        'JBrowse/Model/Location',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/View/Track/CanvasFeatures',
        'dojo/aspect',
        'dojo/window',
        'dojo/dom-construct',
        'dijit/form/TextBox',
        'dijit/form/Button',
        'dijit/form/RadioButton',
        'dijit/Dialog',
        'FileSaver/FileSaver'
    ],
    function(
        declare,
        array,
        lang,
        domEvent,
        mouse,
        domConstruct,
        Deferred,
        on,
        has,
        Util,
        Layout,
        BlockBasedTrack,
        ExportMixin,
        Errors,
        FeatureDetailMixin,
        FeatureContextMenuMixin,
        YScaleMixin,
        Location,
        SimpleFeature,
        CanvasFeatures,
        aspect,
        dojoWindow,
        dom,
        dijitTextBox,
        dijitButton,
        dijitRadioButton,
        dijitDialog,
        FileSaver
    ) {

        var FRectIndex = declare( null,  {
            constructor: function( args ) {
                var height = args.h;
                var width  = args.w;

                this.dims = { h: height, w: width };

                this.byID = {};
            },

            getByID: function( id ) {
                return this.byID[id];
            },

            addAll: function( fRects ) {
                var byID = this.byID;
                var cW = this.dims.w;
                var cH = this.dims.h;
                array.forEach( fRects, function( fRect ) {
                    if( ! fRect )
                        return;

                    // by ID
                    byID[ fRect.f.id() ] = fRect;
                }, this );
            },

            getAll: function( ) {
                var fRects = [];
                for( var id in this.byID ) {
                    fRects.push( this.byID[id] );
                }
                return fRects;
            }
        });

        return declare(
            [
                CanvasFeatures
            ],
            {

                constructor: function ( args ) {
                    
                },

                _defaultConfig: function () {
                    var oldConfig = this.inherited(arguments);
                    var newConfig = lang.mixin(
                        oldConfig,
                        {
                            histograms: {
                                height: 100,
                                color: '#fd79a8'
                            }
                        }
                    );

                    return newConfig;
                },

                _drawHistograms: function ( viewArgs, histData) {
                    var _this = this;
                    // First we're going to find the max value
                    var maxValue = histData.length > 0 ? histData[0].value : 0;
                    array.forEach(histData,function (item, index) {
                        if(maxValue < item.value)
                        {
                            maxValue = item.value;
                        }
                    });

                    var block = viewArgs.block;
                    var histogramHeight = this.config.histograms.height;
                    var trackTotalHeight = histogramHeight + 100;
                    var scale = viewArgs.scale; // 0.019079618407631848
                    var leftBase = viewArgs.leftBase;
                    var rightBase = viewArgs.rightBase;
                    // var minVal = this.config.histograms.min;

                    // Calc the diff between max(last) and min(first) key
                    var keyMin = parseFloat(histData[0].key);
                    var keyMax = parseFloat(histData[histData.length - 1].key);
                    var keyDiff = Math.ceil(keyMax - keyMin);
                    // Calc the scale level
                    var keyScale = parseFloat(keyDiff) / (rightBase - leftBase - 1);

                    domConstruct.empty(block.domNode);
                    var c = block.featureCanvas =
                        domConstruct.create(
                            'canvas',
                            {
                                height: trackTotalHeight,
                                width: block.domNode.offsetWidth + 1,
                                style: {
                                    cursor: 'default',
                                    height: trackTotalHeight + 'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'Browser doesn\'t support HTML canvas element',
                                className: 'canvas-track canvas-track-histograms'
                            },
                            block.domNode
                        );

                    // Done: Update Histogram Height
                    this.heightUpdate(trackTotalHeight, viewArgs.blockIndex);
                    var ctx = c.getContext('2d');
                    ctx.fillStyle = this.config.histograms.color;
                    ctx.textAlign = "center";
                    ctx.font = "Arial";

                    // Draw the X-Axis line
                    ctx.beginPath();
                    ctx.moveTo(0,trackTotalHeight);
                    ctx.lineTo(Math.ceil((rightBase - leftBase + 1)*scale),trackTotalHeight);
                    ctx.stroke();
                    // Prepare for the arrow
                    ctx.beginPath();

                    // Todo: Scale the canvas
                    array.forEach(histData,function (item, index) {
                        var barHeight = item.value / maxValue * histogramHeight;
                        var barWidth = 3;
                        var barLeft_X = (parseFloat(item.key) - keyMin) / keyScale * scale;
                        var barLeft_Y = trackTotalHeight - barHeight;
                        // Draw histogram
                        ctx.fillRect(
                            barLeft_X,
                            barLeft_Y,
                            barWidth,
                            barHeight
                        );

                        if(item.label != null)
                        {
                            // Draw arrow above the histogram column
                            _this._drawArrow(
                                ctx,
                                barLeft_X + 1,
                                barLeft_Y - 70,
                                barLeft_X + 1,
                                barLeft_Y - 5
                            );
                            // Draw label above the arrow
                            ctx.fillText(item.label,barLeft_X + 1, barLeft_Y - 75);
                            // Draw value above the label
                            ctx.fillText((Math.round(item.value * 100) / 100).toString(),
                                barLeft_X + 1, barLeft_Y - 85);
                        }
                    });
                    ctx.stroke();

                    // Todo: Beautify
                    // Todo: After rendering the histogram, scale the Y-axis
                },
                
                _drawArrow: function (context, fromX, fromY, toX, toY){
                    var headLength = 5;
                    var angle = Math.atan2(toY-fromY,toX-fromX);
                    context.moveTo(fromX, fromY);
                    context.lineTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle-Math.PI/6),toY-headLength*Math.sin(angle-Math.PI/6));
                    context.moveTo(toX, toY);
                    context.lineTo(toX-headLength*Math.cos(angle+Math.PI/6),toY-headLength*Math.sin(angle+Math.PI/6));
                    // Call this function several times, then context.stroke()
                },

                // For demo/testing only
                _generateRandomData: function ( histData , blockLeftBase ) {
                    if(blockLeftBase < 0)
                    {
                        blockLeftBase = 0;
                    }

                    var newHistData = lang.clone(histData);
                    var minKey = 300;
                    var minValue = 300;
                    var tempIncrease = 1;

                    array.forEach(newHistData,function (item, index) {
                        item.key = minKey + 150 * index + Math.random() * 130;
                        item.value = minValue + Math.random() * 6000;

                        if(index === newHistData.length - 3 && tempIncrease <=3 ) {
                            if(1 === tempIncrease)
                            {
                                newHistData[newHistData.length - 3].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                            if(2 === tempIncrease)
                            {
                                newHistData[newHistData.length - 2].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                            if(3 === tempIncrease)
                            {
                                newHistData[newHistData.length - 1].label = 'B' +
                                    ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                                tempIncrease ++;
                            }
                        }
                        else if(Math.random() > 0.8 && tempIncrease <= 3) {
                            item.label = 'B' +
                                ( parseInt(blockLeftBase / newHistData.length)*3 + tempIncrease);
                            tempIncrease ++;
                        }
                        else {
                            item.label = null;
                        }
                    }, this);

                    return newHistData;
                },


                setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
                    this.inherited( arguments );
                    this.staticCanvas = domConstruct.create('canvas', { className: 'static-canvas', style: { height: "100%", cursor: "default", position: "absolute", zIndex: 15 }}, trackDiv);
                    let ctx = this.staticCanvas.getContext('2d')
                    let ratio = Util.getResolution( ctx, this.browser.config.highResolutionMode );
                    this.staticCanvas.height = this.staticCanvas.offsetHeight*ratio;

                    this._makeLabelTooltip( );
                },

                guessGlyphType: function(feature) {
                    // first try to guess by its SO type
                    let guess = {
                        'gene': 'Gene',
                        'mRNA': 'ProcessedTranscript',
                        'transcript': 'ProcessedTranscript',
                        'ncRNA': 'UnprocessedTranscript',
                        'lncRNA': 'UnprocessedTranscript',
                        'lnc_RNA': 'UnprocessedTranscript',
                        'miRNA': 'UnprocessedTranscript'
                    }[feature.get('type')]

                    // otherwise, make it Segments if it has children,
                    // a BED if it has block_count/thick_start,
                    // or a Box otherwise
                    if (!guess) {
                        let children = feature.children()
                        if (children && children.length)
                            guess = 'Segments'
                        else if (feature.get('block_count') || feature.get('thick_start'))
                            guess = 'UCSC/BED'
                        else
                            guess = 'Box'
                    }

                    return 'JBrowse/View/FeatureGlyph/'+guess
                },


                // override the base error handler to try to draw histograms if
                // it's a data overflow error and we know how to draw histograms
                _handleError: function( error, viewArgs ) {

                    if( typeof error == 'object'
                        && error instanceof Errors.DataOverflow
                        && ( this.config.histograms.store || this.store.getRegionFeatureDensities )
                    ) {
                        this.fillHistograms( viewArgs );
                    }
                    else
                        this.inherited(arguments);
                },

                // create the layout if we need to, and if we can
                _getLayout: function( scale ) {
                    if( ! this.layout || this._layoutpitchX != 1/scale ) {
                        // if no layoutPitchY configured, calculate it from the
                        // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
                        // calculation didn't result in anything sensible.
                        var pitchY = this.getConf('layoutPitchY') || 4;
                        this.layout = new Layout({ pitchX: 1/scale, pitchY: pitchY, maxHeight: this.getConf('maxHeight'), displayMode: this.displayMode });
                        this._layoutpitchX = 1/scale;
                    }

                    return this.layout;
                },

                _clearLayout: function() {
                    delete this.layout;
                },

                hideAll: function() {
                    this._clearLayout();
                    return this.inherited( arguments );
                },

                /**
                 * Returns a promise for the appropriate glyph for the given
                 * feature and args.
                 */
                getGlyph: function( viewArgs, feature, callback, errorCallback ) {
                    var glyphClassName = this.getConfForFeature( 'glyph', feature );
                    var glyph, interestedParties;
                    if(( glyph = this.glyphsLoaded[glyphClassName] )) {
                        callback( glyph );
                    }
                    else if(( interestedParties = this.glyphsBeingLoaded[glyphClassName] )) {
                        interestedParties.push( callback );
                    }
                    else {
                        var thisB = this;
                        this.glyphsBeingLoaded[glyphClassName] = [callback];


                        dojo.global.require( [glyphClassName], function( GlyphClass ) {
                            if( typeof GlyphClass == 'string' ) {
                                thisB.fatalError = "could not load glyph "+glyphClassName;
                                thisB.redraw();
                                return;
                            }
                            // if this require came back after we are already destroyed, just ignore it
                            if( thisB.destroyed )
                                return;

                            glyph = thisB.glyphsLoaded[glyphClassName] =
                                new GlyphClass({ track: thisB, config: thisB.config, browser: thisB.browser });

                            array.forEach( thisB.glyphsBeingLoaded[glyphClassName], function( cb ) {
                                cb( glyph );
                            });

                            delete thisB.glyphsBeingLoaded[glyphClassName];

                        });
                    }
                },


                _scaleCanvas(c, pxWidth = c.width, pxHeight = c.height) {
                    let ctx = c.getContext('2d')

                    let ratio = Util.getResolution( ctx, this.browser.config.highResolutionMode );

                    c.width = pxWidth * ratio;
                    c.height = pxHeight * ratio;

                    c.style.width = pxWidth + 'px';
                    c.style.height = pxHeight + 'px';

                    // now scale the context to counter
                    // the fact that we've manually scaled
                    // our canvas element
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.scale(ratio, ratio);
                },

                _drawHistograms: function( viewArgs, histData ) {
                    if(this.noYScale) {
                        return
                    }

                    var maxScore = 'max' in this.config.histograms ? this.config.histograms.max : (histData.stats||{}).max;

                    // don't do anything if we don't know the score max
                    if( maxScore === undefined ) {
                        console.warn( 'no stats.max in hist data, not drawing histogram for block '+viewArgs.blockIndex );
                        return;
                    }

                    // don't do anything if we have no hist features
                    var features;
                    if(!( ( features = histData.features )
                        || histData.bins && ( features = this._histBinsToFeatures( viewArgs, histData ) )
                    ))
                        return;

                    var block = viewArgs.block;
                    var height = this.config.histograms.height;
                    var scale = viewArgs.scale;
                    var leftBase = viewArgs.leftBase;
                    var minVal = this.config.histograms.min;

                    domConstruct.empty( block.domNode );
                    var c = block.featureCanvas =
                        domConstruct.create(
                            'canvas',
                            { height: height,
                                width:  block.domNode.offsetWidth+1,
                                style: {
                                    cursor: 'default',
                                    height: height+'px',
                                    position: 'absolute'
                                },
                                innerHTML: 'Your web browser cannot display this type of track.',
                                className: 'canvas-track canvas-track-histograms'
                            },
                            block.domNode
                        );
                    this.heightUpdate( height, viewArgs.blockIndex );
                    var ctx = c.getContext('2d');

                    // scale the canvas to work well with the various device pixel ratios
                    this._scaleCanvas(c)

                    ctx.fillStyle = this.config.histograms.color;
                    for( var i = 0; i<features.length; i++ ) {
                        var feature = features[i];
                        var barHeight = feature.get('score')/maxScore * height;
                        var barWidth = Math.ceil( ( feature.get('end')-feature.get('start') )*scale );
                        var barLeft = Math.round(( feature.get('start') - leftBase )*scale );
                        ctx.fillRect(
                            barLeft,
                            height-barHeight,
                            barWidth,
                            barHeight
                        );
                        if( barHeight > height ) {
                            ctx.fillStyle = this.config.histograms.clip_marker_color;
                            ctx.fillRect( barLeft, 0, barWidth, 3 );
                            ctx.fillStyle = this.config.histograms.color;
                        }
                    }

                    // make the y-axis scale for our histograms
                    this.makeHistogramYScale( height, minVal, maxScore );
                },

                _histBinsToFeatures: function( viewArgs, histData ) {
                    var bpPerBin = parseFloat( histData.stats.basesPerBin );
                    var leftBase = viewArgs.leftBase;

                    return array.map(
                        histData.bins,
                        function( bin, i ) {
                            return new SimpleFeature(
                                { data: {
                                        start: leftBase + i*bpPerBin,
                                        end: leftBase + (i+1)*bpPerBin,
                                        score: bin
                                    }});
                        });
                },

                makeHistogramYScale: function( height, minVal, maxVal ) {
                    if( this.yscale_params
                        && this.yscale_params.height == height
                        && this.yscale_params.max == maxVal
                        && this.yscale_params.min == minVal
                    )
                        return;

                    this.yscale_params = { height: height, min: minVal, max: maxVal };
                    this.makeYScale({ min: minVal, max: maxVal });
                },

                fillFeatures: function( args ) {
                    var blockIndex = args.blockIndex
                    var block = args.block
                    var blockWidthPx = block.domNode.offsetWidth
                    var scale = args.scale
                    var leftBase = args.leftBase
                    var rightBase = args.rightBase
                    var finishCallback = args.finishCallback

                    const fRects = []

                    // count of how many features are queued up to be laid out
                    let featuresInProgress = 0
                    // promise that resolved when all the features have gotten laid out by their glyphs
                    const featuresLaidOut = new Deferred()
                    // flag that tells when all features have been read from the
                    // store (not necessarily laid out yet)
                    let allFeaturesRead = false

                    const errorCallback = e => {
                        this._handleError(e, args)
                        finishCallback(e)
                    }

                    const layout = this._getLayout( scale )

                    // query for a slightly larger region than the block, so that
                    // we can draw any pieces of glyphs that overlap this block,
                    // but the feature of which does not actually lie in the block
                    // (long labels that extend outside the feature's bounds, for
                    // example)
                    const bpExpansion = Math.round( this.config.maxFeatureGlyphExpansion / scale )

                    const region = {
                        ref: this.refSeq.name,
                        start: Math.max( 0, leftBase - bpExpansion ),
                        end: rightBase + bpExpansion,
                        viewAsPairs: this.config.viewAsPairs,
                        viewAsSpans: this.config.viewAsSpans,
                        maxInsertSize: this.config.maxInsertSize
                    }

                    const featCallback = feature => {
                        if( this.destroyed || ! this.filterFeature( feature ) )
                            return
                        fRects.push(null) // put a placeholder in the fRects array
                        featuresInProgress++
                        var rectNumber = fRects.length-1

                        // get the appropriate glyph object to render this feature
                        this.getGlyph(
                            args,
                            feature,
                            glyph => {
                                // have the glyph attempt
                                // to add a rendering of
                                // this feature to the
                                // layout
                                var fRect = glyph.layoutFeature(
                                    args,
                                    layout,
                                    feature
                                );
                                if( fRect === null ) {
                                    // could not lay out, would exceed our configured maxHeight
                                    // mark the block as exceeding the max height
                                    block.maxHeightExceeded = true;
                                }
                                else {
                                    // laid out successfully
                                    if( !( fRect.l >= blockWidthPx || fRect.l+fRect.w < 0 ) )
                                        fRects[rectNumber] = fRect;
                                }

                                // this might happen after all the features have been sent from the store
                                if( ! --featuresInProgress && allFeaturesRead ) {
                                    featuresLaidOut.resolve();
                                }
                            },
                            errorCallback
                        )
                    }

                    this.store.getFeatures(
                        region,
                        featCallback,
                        // callback when all features sent
                        () => {
                            if( this.destroyed )
                                return

                            allFeaturesRead = true
                            if( ! featuresInProgress && ! featuresLaidOut.isFulfilled() ) {
                                featuresLaidOut.resolve()
                            }

                            featuresLaidOut.then( () => {
                                const totalHeight = layout.getTotalHeight()
                                const c = block.featureCanvas =
                                    domConstruct.create(
                                        'canvas',
                                        { height: totalHeight,
                                            width:  block.domNode.offsetWidth+1,
                                            style: {
                                                cursor: 'default',
                                                height: totalHeight+'px',
                                                position: 'absolute'
                                            },
                                            innerHTML: 'Your web browser cannot display this type of track.',
                                            className: 'canvas-track'
                                        },
                                        block.domNode
                                    )
                                const ctx = c.getContext('2d')
                                // scale the canvas to work well with the various device pixel ratios
                                this._scaleCanvas(c)

                                if (block.maxHeightExceeded)
                                    this.markBlockHeightOverflow(block)

                                this.heightUpdate(totalHeight, blockIndex)

                                this.renderFeatures(args, fRects)

                                this.renderClickMap(args, fRects)

                                finishCallback()
                            })
                        },
                        errorCallback
                    )
                },

                startZoom: function() {
                    this.zooming = true
                    this.inherited( arguments );

                    array.forEach( this.blocks, function(b) {
                        try {
                            b.featureCanvas.style.width = '100%';
                        } catch(e) {};
                    });
                },

                endZoom: function() {
                    array.forEach( this.blocks, function(b) {
                        try {
                            delete b.featureCanvas.style.width;
                        } catch(e) {};
                    });

                    this.clear();
                    this.inherited( arguments );
                    this.zooming = false
                },

                renderClickMap: function( args, fRects ) {
                    var block = args.block;

                    // make an index of the fRects by ID, and by coordinate, and
                    // store it in the block
                    var index = new FRectIndex({ h: block.featureCanvas.height, w: block.featureCanvas.width });
                    block.fRectIndex = index;
                    index.addAll( fRects );

                    if( ! block.featureCanvas || ! block.featureCanvas.getContext('2d') ) {
                        console.warn( "No 2d context available from canvas" );
                        return;
                    }

                    this._attachMouseOverEvents( );
                    if( this.displayMode != 'collapsed' || !this.config.disableCollapsedClick ) {
                        // connect up the event handlers
                        this._connectEventHandlers( block );
                    }

                    this.updateStaticElements( { x: this.browser.view.getX() } );
                },

                _attachMouseOverEvents: function( ) {
                    var gv = this.browser.view;
                    var thisB = this;

                    if( this.displayMode == 'collapsed' && !this.config.enableCollapsedMouseover) {
                        if( this._mouseoverEvent ) {
                            this._mouseoverEvent.remove();
                            delete this._mouseoverEvent;
                        }

                        if( this._mouseoutEvent ) {
                            this._mouseoutEvent.remove();
                            delete this._mouseoutEvent;
                        }
                    } else if( this.displayMode != 'collapsed' || this.config.enableCollapsedMouseover ) {
                        if( !this._mouseoverEvent ) {
                            this._mouseoverEvent = this.own( on( this.staticCanvas, 'mousemove', function( evt ) {
                                evt = domEvent.fix( evt );
                                var bpX = gv.absXtoBp( evt.clientX );
                                var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                                thisB.mouseoverFeature( feature, evt );
                            }))[0];
                        }

                        if( !this._mouseoutEvent ) {
                            this._mouseoutEvent = this.own( on( this.staticCanvas, 'mouseout', function( evt) {
                                thisB.mouseoverFeature( undefined );
                            }))[0];
                        }
                    }
                },

                _makeLabelTooltip: function( ) {

                    if( !this.showTooltips || this.labelTooltip )
                        return;

                    var labelTooltip = this.labelTooltip = domConstruct.create(
                        'div', {
                            className: 'featureTooltip',
                            style: {
                                position: 'fixed',
                                display: 'none',
                                zIndex: 19
                            }
                        }, this.browser.container );
                    domConstruct.create(
                        'span', {
                            className: 'tooltipLabel',
                            style: {
                                display: 'block'
                            }
                        }, labelTooltip);
                    domConstruct.create(
                        'span', {
                            className: 'tooltipDescription',
                            style: {
                                display: 'block'
                            }
                        }, labelTooltip);
                },

                _connectEventHandlers: function( block ) {
                    for( var event in this.eventHandlers ) {
                        var handler = this.eventHandlers[event];
                        (function( event, handler ) {
                            var thisB = this;
                            block.own(
                                on( this.staticCanvas, event, function( evt ) {
                                    evt = domEvent.fix( evt );
                                    var bpX = thisB.browser.view.absXtoBp( evt.clientX );
                                    if( block.containsBp( bpX ) ) {
                                        var feature = thisB.layout.getByCoord( bpX, ( evt.offsetY === undefined ? evt.layerY : evt.offsetY ) );
                                        if( feature ) {
                                            var fRect = block.fRectIndex.getByID( feature.id() );
                                            handler.call({
                                                    track: thisB,
                                                    feature: feature,
                                                    fRect: fRect,
                                                    block: block,
                                                    callbackArgs: [ thisB, feature, fRect ]
                                                },
                                                feature,
                                                fRect,
                                                block,
                                                thisB,
                                                evt
                                            );
                                        }
                                    }
                                })
                            );
                        }).call( this, event, handler );
                    }
                },

                getRenderingContext: function( viewArgs ) {
                    if( ! viewArgs.block || ! viewArgs.block.featureCanvas )
                        return null;
                    try {
                        var ctx = viewArgs.block.featureCanvas.getContext('2d');
                        // ctx.translate( viewArgs.block.offsetLeft - this.featureCanvas.offsetLeft, 0 );
                        // console.log( viewArgs.blockIndex, 'block offset', viewArgs.block.offsetLeft - this.featureCanvas.offsetLeft );
                        return ctx;
                    } catch(e) {
                        console.error(e, e.stack);
                        return null;
                    }
                },

                // draw the features on the canvas
                renderFeatures: function( args, fRects ) {
                    var context = this.getRenderingContext( args );
                    if( context ) {
                        var thisB = this;
                        array.forEach( fRects, function( fRect ) {
                            if( fRect )
                                thisB.renderFeature( context, fRect );
                        });
                    }
                },

                // given viewargs and a feature object, highlight that feature in
                // all blocks.  if feature is undefined or null, unhighlight any currently
                // highlighted feature
                mouseoverFeature: function( feature, evt ) {

                    if( this.lastMouseover == feature )
                        return;

                    if( evt )
                        var bpX = this.browser.view.absXtoBp( evt.clientX );

                    if( this.labelTooltip)
                        this.labelTooltip.style.display = 'none';

                    array.forEach( this.blocks, function( block, i ) {
                        if( ! block )
                            return;
                        var context = this.getRenderingContext({ block: block, leftBase: block.startBase, scale: block.scale });
                        if( ! context )
                            return;

                        if( this.lastMouseover && block.fRectIndex ) {
                            var r = block.fRectIndex.getByID( this.lastMouseover.id() );
                            if( r )
                                this.renderFeature( context, r );
                        }

                        if( block.tooltipTimeout )
                            window.clearTimeout( block.tooltipTimeout );

                        if( feature ) {
                            var fRect = block.fRectIndex && block.fRectIndex.getByID( feature.id() );
                            if( ! fRect )
                                return;

                            if( block.containsBp( bpX ) ) {
                                var renderTooltip = dojo.hitch( this, function() {
                                    if( !this.labelTooltip )
                                        return;
                                    var label = fRect.label || fRect.glyph.makeFeatureLabel( feature );
                                    var description = fRect.description || fRect.glyph.makeFeatureDescriptionLabel( feature );

                                    if( ( !label && !description ) )
                                        return;

                                    if( !this.ignoreTooltipTimeout ) {
                                        this.labelTooltip.style.left = evt.clientX + "px";
                                        this.labelTooltip.style.top = (evt.clientY + 15) + "px";
                                    }
                                    this.ignoreTooltipTimeout = true;
                                    this.labelTooltip.style.display = 'block';
                                    var labelSpan = this.labelTooltip.childNodes[0],
                                        descriptionSpan = this.labelTooltip.childNodes[1];

                                    if( this.config.onClick&&this.config.onClick.label ) {
                                        var context = lang.mixin( { track: this, feature: feature, callbackArgs: [ this, feature ] } );
                                        labelSpan.style.display = 'block';
                                        labelSpan.style.font = label.font;
                                        labelSpan.style.color = label.fill;
                                        var t = this.template( feature, this._evalConf( context, this.config.onClick.label, "label" ) )
                                        labelSpan.innerHTML = this.config.unsafeMouseover ? t : Util.escapeHTML(t)
                                        return;
                                    }
                                    if( label ) {
                                        labelSpan.style.display = 'block';
                                        labelSpan.style.font = label.font;
                                        labelSpan.style.color = label.fill;
                                        labelSpan.innerHTML = this.config.unsafeMouseover ? label.text : Util.escapeHTML(label.text);
                                    } else {
                                        labelSpan.style.display = 'none';
                                        labelSpan.innerHTML = '(no label)';
                                    }
                                    if( description ) {
                                        descriptionSpan.style.display = 'block';
                                        descriptionSpan.style.font = description.font;
                                        descriptionSpan.style.color = description.fill;
                                        descriptionSpan.innerHTML = this.config.unsafeMouseover ? description.text : Util.escapeHTML(description.text);
                                    }
                                    else {
                                        descriptionSpan.style.display = 'none';
                                        descriptionSpan.innerHTML = '(no description)';
                                    }
                                });
                                if( this.ignoreTooltipTimeout )
                                    renderTooltip();
                                else
                                    block.tooltipTimeout = window.setTimeout( renderTooltip, 600);
                            }

                            fRect.glyph.mouseoverFeature( context, fRect );
                            this._refreshContextMenu( fRect );
                        } else {
                            block.tooltipTimeout = window.setTimeout( dojo.hitch(this, function() { this.ignoreTooltipTimeout = false; }), 200);
                        }
                    }, this );

                    this.lastMouseover = feature;
                },

                cleanupBlock: function(block) {
                    this.inherited( arguments );

                    // garbage collect the layout
                    if ( block && this.layout )
                        this.layout.discardRange( block.startBase, block.endBase );
                },

                // draw each feature
                renderFeature: function( context, fRect ) {
                    fRect.glyph.renderFeature( context, fRect );
                },

                _trackMenuOptions: function () {
                    var opts = this.inherited(arguments);
                    var thisB = this;

                    var displayModeList = ["normal", "compact", "collapsed"];
                    this.displayModeMenuItems = displayModeList.map(function(displayMode) {
                        return {
                            label: displayMode,
                            type: 'dijit/CheckedMenuItem',
                            title: "Render this track in " + displayMode + " mode",
                            checked: thisB.displayMode == displayMode,
                            onClick: function() {
                                thisB.displayMode = displayMode;
                                thisB._clearLayout();
                                thisB.hideAll();
                                thisB.genomeView.showVisibleBlocks(true);
                                thisB.makeTrackMenu();
                                // set cookie for displayMode
                                thisB.browser.cookie('track-' + thisB.name, thisB.displayMode);
                            }
                        };
                    });

                    var updateMenuItems = dojo.hitch(this, function() {
                        for(var index in this.displayModeMenuItems) {
                            this.displayModeMenuItems[index].checked = (this.displayMode == this.displayModeMenuItems[index].label);
                        }
                    });

                    opts.push.apply(
                        opts,
                        [
                            { type: 'dijit/MenuSeparator' },
                            {
                                label: "Display mode",
                                iconClass: "dijitIconPackage",
                                title: "Make features take up more or less space",
                                children: this.displayModeMenuItems
                            },
                            { label: 'Show labels',
                                type: 'dijit/CheckedMenuItem',
                                checked: !!( 'showLabels' in this ? this.showLabels : this.config.style.showLabels ),
                                onClick: function(event) {
                                    thisB.showLabels = this.checked;
                                    thisB.changed();
                                }
                            }
                        ]
                    );

                    return opts;
                },

                _exportFormats: function() {
                    return [ {name: 'GFF3', label: 'GFF3', fileExt: 'gff3'}, {name: 'BED', label: 'BED', fileExt: 'bed'}, { name: 'SequinTable', label: 'Sequin Table', fileExt: 'sqn' } ];
                },

                updateStaticElements: function( coords ) {
                    this.inherited( arguments );

                    this.updateYScaleFromViewDimensions( coords );

                    if( coords.hasOwnProperty("x") ) {
                        var context = this.staticCanvas.getContext('2d');
                        let ratio = Util.getResolution( context, this.browser.config.highResolutionMode );
                        this.staticCanvas.width = this.browser.view.elem.clientWidth*ratio;
                        this.staticCanvas.style.width = this.browser.view.elem.clientWidth + "px";
                        this.staticCanvas.style.left = coords.x + "px";
                        context.setTransform(1,0,0,1,0,0)
                        context.scale(ratio,ratio)
                        context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

                        var minVisible = this.browser.view.minVisible();
                        var maxVisible = this.browser.view.maxVisible();
                        var viewArgs = {
                            minVisible: minVisible,
                            maxVisible: maxVisible,
                            bpToPx: dojo.hitch(this.browser.view, "bpToPx"),
                            lWidth: this.label.offsetWidth
                        };

                        this.blocks.forEach(block => {
                            if( !block || !block.fRectIndex || this.zooming )
                                return;

                            var idx = block.fRectIndex.byID;
                            for( var id in idx ) {
                                var fRect = idx[id];
                                fRect.glyph.updateStaticElements( context, fRect, viewArgs );
                            }
                        });
                    }
                },

                heightUpdate: function( height, blockIndex ) {
                    this.inherited( arguments );
                    if( this.staticCanvas ) {
                        let ratio = Util.getResolution( this.staticCanvas.getContext('2d'), this.browser.config.highResolutionMode );
                        this.staticCanvas.height = this.staticCanvas.offsetHeight*ratio;
                    }
                },

                destroy: function() {
                    this.destroyed = true;

                    domConstruct.destroy( this.staticCanvas );
                    delete this.staticCanvas;

                    delete this.layout;
                    delete this.glyphsLoaded;
                    this.inherited( arguments );
                },


                fillBlock: function ( renderArgs ) {
                    // var blockIndex = renderArgs.blockIndex;
                    // var block = renderArgs.block;
                    // var leftBase = renderArgs.leftBase;
                    // var rightBase = renderArgs.rightBase;
                    // var scale = renderArgs.scale;

                    // Todo: Check if the user's browser support HTML canvas element
                    this.fillHistograms( renderArgs );
                },

                fillHistograms: function ( args ) {
                    var histData = [
                        { key: "632.0333849", value: "2988.667223" , label: null },
                        { key: "680.5928342", value: "1155.390511" , label: null },
                        { key: "710.411926", value: "1152.658037" , label: null },
                        { key: "749.4333483", value: "1729.825008" , label: null },
                        { key: "831.3868395", value: "1264.8382" , label: null },
                        { key: "853.488464", value: "1913.211091" , label: "B1" },
                        { key: "868.6782834", value: "3533.121477" , label: null },
                        { key: "1156.646592", value: "1052.036554" , label: "B2" },
                        { key: "1194.012072", value: "935.1523377" , label: null },
                        { key: "1289.746934", value: "2645.348555" , label: null },
                        { key: "1407.809556", value: "673.3459446" , label: "B3" },
                        { key: "1438.879551", value: "1615.504777" , label: null },
                        { key: "1549.889269", value: "2041.588973" , label: "B4" },
                        { key: "1651.942614", value: "1593.798358" , label: null },
                        { key: "1790.011013", value: "1352.322675" , label: null },
                        { key: "1947.576779", value: "1256.54348" , label: null },
                        { key: "2169.220591", value: "1257.662272" , label: null },
                        { key: "2197.030845", value: "932.6885953" , label: null },
                        { key: "2251.280739", value: "3531.849469" , label: null },
                        { key: "2276.080739", value: "9873.694419" , label: null }
                    ];

                    // Generating test data
                    histData = this._generateRandomData(histData, args.leftBase);

                    // Todo: Remove the code above, Query feature histogram data from STORE
                    // and push into histData Object
                    this._drawHistograms(args, histData);
                },


                _canSaveFiles: function() {
                    return has('save-generated-files') && ! this.config.noExportFiles;
                },

                _canExport: function() {
                    if( this.config.noExport )
                        return false;

                    var highlightedRegion = this.browser.getHighlight();
                    var visibleRegion = this.browser.view.visibleRegion();
                    var wholeRefSeqRegion = { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end };
                    var canExportVisibleRegion = this._canExportRegion( visibleRegion );
                    var canExportWholeRef = this._canExportRegion( wholeRefSeqRegion );
                    return highlightedRegion && this._canExportRegion( highlightedRegion )
                        || this._canExportRegion( visibleRegion )
                        || this._canExportRegion( wholeRefSeqRegion );
                },

                _possibleExportRegions: function() {
                    var regions = [
                        // the visible region
                        (function() {
                            var r = dojo.clone( this.browser.view.visibleRegion() );
                            r.description = 'Visible region';
                            r.name = 'visible';
                            return r;
                        }.call(this)),
                        // whole reference sequence
                        { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end, description: 'Whole reference sequence', name: 'wholeref' }
                    ];

                    var highlightedRegion = this.browser.getHighlight();
                    if( highlightedRegion ) {
                        regions.unshift( lang.mixin( lang.clone( highlightedRegion ), { description: "Highlighted region", name: "highlight" } ) );
                    }

                    return regions;
                },

                _exportDialogContent: function() {
                    // note that the `this` for this content function is not the track, it's the menu-rendering context
                    var possibleRegions = this.track._possibleExportRegions();

                    // for each region, calculate its length and determine whether we can export it
                    array.forEach( possibleRegions, function( region ) {
                        region.length = Math.round( region.end - region.start + 1 );
                        region.canExport = this._canExportRegion( region );
                    },this.track);

                    var setFilenameValue = dojo.hitch(this.track, function() {
                        var region = this._readRadio(form.elements.region);
                        var format = nameToExtension[this._readRadio(form.elements.format)];
                        form.elements.filename.value = ((this.key || this.label) + "-" + region).replace(/[^ .a-zA-Z0-9_-]/g,'-') + "." + format;
                    });

                    var form = dom.create('form', { onSubmit: function() { return false; } });
                    var regionFieldset = dom.create('fieldset', {className: "region"}, form );
                    dom.create('legend', {innerHTML: "Region to save"}, regionFieldset);

                    var checked = 0;
                    array.forEach( possibleRegions, function(r) {
                        var locstring = Util.assembleLocString(r);
                        var regionButton = new dijitRadioButton(
                            { name: "region", id: "region_"+r.name,
                                value: locstring, checked: r.canExport && !(checked++) ? "checked" : ""
                            });
                        regionFieldset.appendChild(regionButton.domNode);
                        var regionButtonLabel = dom.create("label", {"for": regionButton.id, innerHTML: r.description+' - <span class="locString">'
                                +         locstring+'</span> ('+Util.humanReadableNumber(r.length)+(r.canExport ? 'b' : 'b, too large')+')'}, regionFieldset);
                        if(!r.canExport) {
                            regionButton.domNode.disabled = "disabled";
                            regionButtonLabel.className = "ghosted";
                        }

                        on(regionButton, "click", setFilenameValue);

                        dom.create('br',{},regionFieldset);
                    });


                    var formatFieldset = dom.create("fieldset", {className: "format"}, form);
                    dom.create("legend", {innerHTML: "Format"}, formatFieldset);

                    checked = 0;
                    var nameToExtension = {};
                    array.forEach( this.track._exportFormats(), function(fmt) {
                        if( ! fmt.name ) {
                            fmt = { name: fmt, label: fmt };
                        }
                        if( ! fmt.fileExt) {
                            fmt.fileExt = fmt.name || fmt;
                        }
                        nameToExtension[fmt.name] = fmt.fileExt;
                        var formatButton = new dijitRadioButton({ name: "format", id: "format"+fmt.name, value: fmt.name, checked: checked++?"":"checked"});
                        formatFieldset.appendChild(formatButton.domNode);
                        var formatButtonLabel = dom.create("label", {"for": formatButton.id, innerHTML: fmt.label}, formatFieldset);

                        on(formatButton, "click", setFilenameValue);
                        dom.create( "br", {}, formatFieldset );
                    },this);


                    var filenameFieldset = dom.create("fieldset", {className: "filename"}, form);
                    dom.create("legend", {innerHTML: "Filename"}, filenameFieldset);
                    dom.create("input", {type: "text", name: "filename", style: {width: "100%"}}, filenameFieldset);

                    setFilenameValue();

                    var actionBar = dom.create( 'div', {
                        className: 'dijitDialogPaneActionBar'
                    });

                    // note that the `this` for this content function is not the track, it's the menu-rendering context
                    var dialog = this.dialog;

                    new dijitButton({ iconClass: 'dijitIconDelete', onClick: dojo.hitch(dialog,'hide'), label: 'Cancel' })
                        .placeAt( actionBar );
                    var viewButton = new dijitButton({ iconClass: 'dijitIconTask',
                        label: 'View',
                        disabled: ! array.some(possibleRegions,function(r) { return r.canExport; }),
                        onClick: lang.partial( this.track._exportViewButtonClicked, this.track, form, dialog )
                    })
                        .placeAt( actionBar );

                    // don't show a download button if we for some reason can't save files
                    if( this.track._canSaveFiles() ) {

                        var dlButton = new dijitButton({ iconClass: 'dijitIconSave',
                            label: 'Save',
                            disabled: ! array.some(possibleRegions,function(r) { return r.canExport; }),
                            onClick: dojo.hitch( this.track, function() {
                                var format = this._readRadio( form.elements.format );
                                var region = this._readRadio( form.elements.region );
                                var filename = form.elements.filename.value.replace(/[^ .a-zA-Z0-9_-]/g,'-');
                                dlButton.set('disabled',true);
                                dlButton.set('iconClass','jbrowseIconBusy');
                                this.exportRegion( region, format, dojo.hitch( this, function( output ) {
                                    dialog.hide();
                                    this._fileDownload({ format: format, data: output, filename: filename });
                                }));
                            })})
                            .placeAt( actionBar );
                    }

                    return [ form, actionBar ];
                },

                // run when the 'View' button is clicked in the export dialog
                _exportViewButtonClicked: function( track, form, dialog ) {
                    var viewButton = this;
                    viewButton.set('disabled',true);
                    viewButton.set('iconClass','jbrowseIconBusy');

                    var region = track._readRadio( form.elements.region );
                    var format = track._readRadio( form.elements.format );
                    var filename = form.elements.filename.value.replace(/[^ .a-zA-Z0-9_-]/g,'-');
                    track.exportRegion( region, format, function(output) {
                        dialog.hide();
                        var text = dom.create('textarea', {
                            rows: Math.round( dojoWindow.getBox().h / 12 * 0.5 ),
                            wrap: 'off',
                            cols: 80,
                            style: "maxWidth: 90em; overflow: scroll; overflow-y: scroll; overflow-x: scroll; overflow:-moz-scrollbars-vertical;",
                            readonly: true
                        });
                        text.value = output;
                        var actionBar = dom.create( 'div', {
                            className: 'dijitDialogPaneActionBar'
                        });
                        var exportView = new dijitDialog({
                            className: 'export-view-dialog',
                            title: format + ' export - <span class="locString">'+ region+'</span> ('+Util.humanReadableNumber(output.length)+'bytes)',
                            content: [ text, actionBar ]
                        });
                        new dijitButton({ iconClass: 'dijitIconDelete',
                            label: 'Close', onClick: dojo.hitch( exportView, 'hide' )
                        })
                            .placeAt(actionBar);

                        // only show a button if the browser can save files
                        if( track._canSaveFiles() ) {
                            var saveDiv = dom.create( "div", { className: "save" }, actionBar );

                            var saveButton = new dijitButton(
                                {
                                    iconClass: 'dijitIconSave',
                                    label: 'Save',
                                    onClick: function() {
                                        var filename = fileNameText.get('value').replace(/[^ .a-zA-Z0-9_-]/g,'-');
                                        exportView.hide();
                                        track._fileDownload({ format: format, data: output, filename: filename });
                                    }
                                }).placeAt(saveDiv);
                            var fileNameText = new dijitTextBox({
                                value: filename,
                                style: "width: 24em"
                            }).placeAt( saveDiv );
                        }

                        aspect.after( exportView, 'hide', function() {
                            // manually unhook and free the (possibly huge) text area
                            text.parentNode.removeChild( text );
                            text = null;
                            setTimeout( function() {
                                exportView.destroyRecursive();
                            }, 500 );
                        });
                        exportView.show();
                    });
                },

                _fileDownload: function( args ) {
                    FileSaver.saveAs(new Blob([args.data], {type: args.format ? 'application/x-'+args.format.toLowerCase() : 'text/plain'}), args.filename);
                    // We will need to check whether this breaks the WebApollo plugin.
                },

                // cross-platform function for (portably) reading the value of a radio control. sigh. *rolls eyes*
                _readRadio: function( r ) {
                    if( r.length ) {
                        for( var i = 0; i<r.length; i++ ) {
                            if( r[i].checked )
                                return r[i].value;
                        }
                    }
                    return r.value;
                },

                exportRegion: function( region, format, callback ) {
                    // parse the locstring if necessary
                    if( typeof region == 'string' )
                        region = Util.parseLocString( region );

                    // we can only export from the currently-visible reference
                    // sequence right now
                    if( region.ref != this.refSeq.name ) {
                        console.error("cannot export data for ref seq "+region.ref+", "
                            + "exporting is currently only supported for the "
                            + "currently-visible reference sequence" );
                        return;
                    }

                    dojo.global.require( [format.match(/\//)?format:'JBrowse/View/Export/'+format], dojo.hitch(this,function( exportDriver ) {
                        new exportDriver({
                            refSeq: this.refSeq,
                            track: this,
                            store: this.store
                        }).exportRegion( region, callback );
                    }));
                },

                _trackMenuOptions: function() {
                    var opts = this.inherited(arguments);

                    if( ! this.config.noExport )
                    // add a "Save track data as" option to the track menu
                        opts.push({ label: 'Save track data',
                            iconClass: 'dijitIconSave',
                            disabled: ! this._canExport(),
                            action: 'bareDialog',
                            content: this._exportDialogContent,
                            dialog: { id: 'exportDialog', className: 'export-dialog' }
                        });

                    return opts;
                },

                _canExportRegion: function( l ) {
                    //console.log('can generic export?');
                    if( ! l ) return false;

                    // if we have a maxExportSpan configured for this track, use it.
                    if( typeof this.config.maxExportSpan == 'number' || typeof this.config.maxExportSpan == 'string' ) {
                        return l.end - l.start + 1 <= this.config.maxExportSpan;
                    }
                    else {
                        // if we know the store's feature density, then use that with
                        // a limit of maxExportFeatures or 5,000 features
                        var thisB = this;
                        var storeStats = {};
                        // will return immediately if the stats are available
                        this.store.getGlobalStats( function( s ) {
                            storeStats = s;
                        }, function(error){ }); // error callback does nothing for now
                        if( storeStats.featureDensity ) {
                            return storeStats.featureDensity*(l.end - l.start) <= ( thisB.config.maxExportFeatures || 50000 );
                        }
                    }

                    // otherwise, i guess we can export
                    return true;
                }

            }
        );
    }
);
