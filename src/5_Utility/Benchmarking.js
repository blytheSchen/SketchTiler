function sumAllProfiles(profiles) {
    let sum = {};
    for(let profile of profiles){
      for (const [modelName, modelProfile] of Object.entries(profile)) {
        if(!sum[modelName]) sum[modelName] = {};
        for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
          let runningTotal = sum[modelName][funcName] ?? 0;
          runningTotal += functionPerformance;
          sum[modelName][funcName] = runningTotal;
        }
      }
    }

    return sum;
}

function printProfile(averages, numRuns = 1){
    let message = `==========================================\n`;
    message += `Average performance over ${numRuns} runs:\n`;
    for (const [modelName, modelProfile] of Object.entries(averages)) {
      message += `\n=== ${modelName.toUpperCase()} MODEL ===\n`;
      for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
        let val = averages[modelName][funcName];  
        message += `${funcName}: ${val} ms\n`;
      }
    }
    message += `\n==========================================`;
    return message;
}

async function getAverageGenerationDuration(callback, args, numRuns, print) {
    let profiles = [];
    const progressBar = document.getElementById("progressBar");

    for (let i = 0; i < numRuns; i++) {
      let profile = callback(args);
      if(!profile){
        // TODO: add errors counter here?
        i--;
        continue;
      }
      profiles.push(profile);

      // update progress bar
      progressBar.value = ((i + 1) / numRuns) * 100;
      await new Promise(resolve => setTimeout(resolve, 10)); // tweak delay as needed
    }

    let avg = sumAllProfiles(profiles);

    for (const [modelName, modelProfile] of Object.entries(avg)) {
      for (const [funcName, functionPerformance] of Object.entries(modelProfile)) {
        avg[modelName][funcName] = (avg[modelName][funcName] / numRuns).toFixed(2);  
      }
    }

    if(print){ 
      const outputElement = document.getElementById("profileMessage");
      const message = printProfile(avg, numRuns);
      
      outputElement.innerHTML = message.replace(/\n/g, '<br>');
      console.log(printProfile(avg, numRuns));
    }

    progressBar.value = 0;
}

async function runWithSpinner(task) {
  const spinner = document.getElementById("thinking-icon");
  spinner.style.display = "inline-block";

  setTimeout(() => {
    task();
    spinner.style.display = "none";
  }, 1);
}

const BENCHMARK = {
    sumAllProfiles: (profiles) => sumAllProfiles(profiles),
    printProfile: (averages, numRuns) => printProfile(averages, numRuns),
    getAverageGenerationDuration: (callback, args, numRuns, print) => getAverageGenerationDuration(callback, args, numRuns, print),
    runWithSpinner: (task) => runWithSpinner(task)
};

export default BENCHMARK;