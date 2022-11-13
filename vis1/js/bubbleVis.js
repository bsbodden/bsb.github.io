class BubbleVis {
    constructor(parentElement, motiveData, narrativeData){
        // The DOM element of the parent
        this.parentElement = parentElement;
        this.motiveData = motiveData;
        this.narrativeData = narrativeData;
        this.data = motiveData;
        //this.motives = [...new Set(data.map(d => d.motive))]
        this.categories = {};
        this.categories["motive"] =  [...new Set(motiveData.map(d => d.motive))]
        this.categories["narrative"] =  [...new Set(narrativeData.map(d => d.narrative))]
        console.log("motives", this.motives);
        selectedCategory =  document.getElementById('category').value;
        console.log("categories", this.categories);

        this.initVis()
    }

    initVis() {
        let vis = this;

        let height = 800 // initial height

        vis.margin = {top: 50, right: 100, bottom: 50, left: 170};
        vis.width = vis.parentElement.getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = vis.parentElement.getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select(vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        vis.x = d3.scaleLinear()
            .domain(d3.extent(vis.data, d => d.date))
            .range([0, vis.width])

        vis.y = d3.scaleBand()
            .domain(vis.categories[selectedCategory])
            .range([height / 2, height / 2])

        vis.r = d3.scaleSqrt()
            .domain(d3.extent(vis.data, d => d.count))
            .range([6, 20])

        vis.colour = d3.scaleSequential(d3.extent(vis.data, d => d.date), d3.interpolatePlasma)

        vis.xAxis = g =>
            g
                //.attr("transform", `translate(0, ${vis.margin.top})`)
                .call(d3.axisTop(vis.x).ticks(10))
                .call(g => g.select(".domain").remove())
                .call(g =>
                    g
                        .append("text")
                        .attr("x", vis.width)
                        .attr("fill", "currentColor")
                        .attr("text-anchor", "middle")
                        .text("Years →")
                )

        vis.yAxis = (g, scale = vis.y, ticks = vis.y.domain()) =>
            g
                .attr("transform", `translate(-150, 0)`)
                .call(d3.axisLeft(scale).tickValues(ticks))
                .call(g => g.style("text-anchor", "start"))
                .call(g => g.select(".domain").remove())

        vis.svg.append("g").call(vis.xAxis);
        vis.yG = vis.svg.append("g").attr("stroke-width", 0);

        // let node = vis.svg.append("g")
        //     .selectAll("circle")
        //     .data(vis.data)
        //     .join("circle")
        //     .attr("cx", d => vis.x(d.date))
        //     .attr("cy", d => vis.y(d.motive) + vis.y.bandwidth() / 2)
        //     .attr("r", d => vis.r(d.count))
        //     .attr("stroke", "white")
        //     .attr("stroke-width", 1)
        //     .attr("fill", d => vis.colour(d.date));
        //
        // vis.simulation = d3.forceSimulation()
        //     .force("x", d3.forceX(d => vis.x(d.date)))
        //     .force("y", d3.forceY(d => vis.y(d.motive) + vis.y.bandwidth() / 2))
        //     .force("collide", d3.forceCollide(d => vis.r(d.count) + 1).strength(0.3));
        //
        // vis.simulation.on("tick", () => {
        //     node
        //         .transition()
        //         .delay((d, i) => d.x)
        //         .ease(d3.easeLinear)
        //         .attr("cx", d => d.x)
        //         .attr("cy", d => d.y)
        // });

        vis.wrangleData();
    }
    wrangleData() {
        let vis = this;

        vis.data = vis.getDataset();
        // Get the selected order
        //vis.selectedOrder =  document.getElementById('ordering').value;

        vis.updateVis()
    }
    updateVis() {
        let vis = this;

        // If the simulation is running already, stop it to free up resources
        if (vis.simulation) vis.simulation.stop();

       // vis.data = vis.getDataset();

        const split = (document.getElementById('split').value !== "all");

        let height = split ? 800 : 400;

        vis.r.domain(d3.extent(vis.data, d => d.count))
        vis.x.domain(d3.extent(vis.data, d => d.date))
        vis.y.domain(vis.categories[selectedCategory])

        if (vis.node) {
            console.log("removing node")
            vis.node.remove();
        }
        vis.node = vis.svg.append("g")
            .selectAll("circle")
            .data(vis.data)
            .join("circle")
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d[selectedCategory]) + vis.y.bandwidth() / 2)
            .attr("r", d => vis.r(d.count))
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .attr("fill", d => vis.colour(d.date));

        console.log("selectedCategory", selectedCategory)

        vis.simulation = d3.forceSimulation()
            .force("x", d3.forceX(d => vis.x(d.date)))
            .force("y", d3.forceY(d => vis.y(d[selectedCategory]) + vis.y.bandwidth() / 2))
            .force("collide", d3.forceCollide(d => vis.r(d.count) + 1).strength(0.3));

        vis.simulation.on("tick", () => {
            vis.node
                .attr("cy", vis.height / 2)
                .transition()
                .delay((d, i) => d.x)
                .ease(d3.easeLinear)
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
        });


        vis.y.domain(split ? vis.categories[selectedCategory] : vis.categories[selectedCategory].concat("Global")); // workaround for updating the yAxis
        vis.y.range(split ? [0, vis.height] : [vis.height / 2, vis.height / 2]);
        let ticks = split ? vis.categories[selectedCategory] : ["Global"];
        console.log("ticks", ticks)

        const t = vis.svg.transition().duration(750);
        vis.svg.transition(t).attr("viewBox", [0, 0, vis.width, height]) ;
        vis.yG.transition(t).call(vis.yAxis, vis.y, ticks);

        vis.simulation.nodes(vis.data); // update nodes
        vis.simulation.alpha(1).restart(); // restart simulation

    }
    // Depending on which data we're looking at, format the ticks to better display it
    getDataset() {
        let vis = this;
        selectedCategory = document.getElementById('category').value;
        switch (selectedCategory) {
            case "motive":
                return vis.motiveData;
            case "narrative":
                return vis.narrativeData;
        }
    }
}