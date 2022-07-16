function loadDepencies() {
  fetch("./depencies.json").then((res) => {
    res.json().then((json) => {
      const toLoad = json.slice();
      json.forEach((file) => {
        
      });
    });
  });
}
