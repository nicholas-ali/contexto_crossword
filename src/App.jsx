import { useState } from 'react'
import './App.css'

const CLUES = ["1A", "1D", "2D", "3A", "3D", "4A", "5A", "5D", "6A", "7A"];
const TOTAL_WORDS = 288751;


const initialBoard = [
    [null,null,null,null,null,null,'','','','',null,null,null,],
    [null,null,null,null,null,null,'',null,'',null,null,null,null,],
    [null,null,null,'','','','',null,'',null,null,null,null,],
    [null,null,null,'',null,null,'',null,'','','','','',],
    [null,null,null,'',null,null,'',null,null,null,null,null,null,],
    [null,null,null,'',null,null,'',null,null,null,null,null,null,],
    ['','','','',null,null,'','','',null,null,null,null,],
    ['',null,null,null,null,null,'',null,null,null,null,null,null,],
    ['',null,null,null,null,null,null,null,null,null,null,null,null,],
    ['',null,null,null,null,null,null,null,null,null,null,null,null,],
    ['','','','','','','','',null,null,null,null,null,],
    ['',null,null,null,null,null,null,null,null,null,null,null,null,]
]

// The Map: React still needs this to know where to put the correct words!
const cluePlacements = {
    "1A": { row: 0, col: 6, direction: "across" },
    "1D": { row: 0, col: 6, direction: "down" },
    "2D": { row: 0, col: 8, direction: "down" },
    "3A": { row: 2, col: 3, direction: "across" },
    "3D": { row: 2, col: 3, direction: "down" },
    "4A": { row: 3, col: 8, direction: "across" },
    "5A": { row: 6, col: 0, direction: "across" },
    "5D": { row: 6, col: 0, direction: "down" },
    "6A": { row: 6, col: 6, direction: "across" },
    "7A": { row: 10, col: 0, direction: "across" }


}

const getCellNumbers = () => {
    const numbers = {}
    Object.keys(cluePlacements).forEach(clueId => {
        const { row, col } = cluePlacements[clueId]
        // Extracts just the number part (e.g., "1" from "1A")
        const number = clueId.replace(/\D/g, '')
        numbers[`${row}-${col}`] = number
    })
    return numbers
}

const cellNumbers = getCellNumbers()

function App() {
    const [grid, setGrid] = useState(initialBoard)
    const [guess, setGuess] = useState('')

    // We use "state" to track what the user types and what Python replies
    const [feedback, setFeedback] = useState('')
    const [, setStatus] = useState('') // Tracks 'correct', 'incorrect', or 'error'
    const [scores, setScores] = useState([])
    const[bests, setBests] = useState([])

    // This function runs when the user clicks the submit button
    const handleSubmit = async () => {
        if (!guess.trim()) return;

        setFeedback('Checking...')
        setStatus('')

        const payload = {
            guess: guess.trim()
        }

        try {
            // Send the guess to your Python Flask server
            const response = await fetch('https://suspect-manicotti-auction.ngrok-free.dev/api/submit_guess', {
            // const response = await fetch('http://localhost:5000/api/submit_guess', {

                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            // Update our state with the response from Python
            const data = await response.json()

            setFeedback(data.message)
            setStatus(data.status)
            setScores(data.scores)

            setGuess('')

            if (data.status === "error") {
                return;
            }

            if (data.scores) {
                setScores(data.scores);

                setBests(prevBests => {
                    const newBests = [...prevBests];

                    data.scores.forEach((newRank, index) => {
                        // FIX: Now we save an object with both the rank AND the word!
                        if (!newBests[index] || newRank < newBests[index].rank) {
                            newBests[index] = { rank: newRank, word: guess };
                        }
                    });

                    return newBests;
                });
            }

            if (data.status === "correct" && data.clue_id) {
                const newGrid = grid.map(row => [...row])
                const placement = cluePlacements[data.clue_id]

                // We use the user's correct guess to fill the board
                const correctWord = payload.guess.toUpperCase()

                for (let i = 0; i < correctWord.length; i++) {
                    if (placement.direction === "across") {
                        newGrid[placement.row][placement.col + i] = correctWord[i]
                    } else if (placement.direction === "down") {
                        newGrid[placement.row + i][placement.col] = correctWord[i]
                    }
                }

                setGrid(newGrid)
            }

        } catch (error) {
            console.log("Error:", error)
            console.error("Error:", error)
            setFeedback("Could not connect to the Python server. Is Flask running?")
            setStatus("error")
        }
    }


    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    }


    return (
        <div className="app-container">
            <h1>Contexto Crossword</h1>

            <div className="game-layout">

                {/* LEFT COLUMN: Board and Input */}
                <div className="left-column">
                    <div className="crossword-board" style={{ gridTemplateColumns: `repeat(${grid[0].length}, 1fr)` }}>
                        {grid.map((row, rowIndex) => (
                            row.map((cell, colIndex) => {
                                if (cell === null) {
                                    return <div key={`${rowIndex}-${colIndex}`} className="black-square"></div>
                                }

                                const cellKey = `${rowIndex}-${colIndex}`

                                return (
                                    <div key={cellKey} className="white-square">
                                        {cellNumbers[cellKey] && (
                                            <span className="clue-number">{cellNumbers[cellKey]}</span>
                                        )}
                                        <span className="cell-letter">{cell}</span>
                                    </div>
                                )
                            })
                        ))}
                    </div>

                    <div className="input-section">
                        <input
                            type="text"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            placeholder="enter guess"
                        />
                    </div>
                </div>


                <div
                    className="feedback-section"
                    style={{
                        visibility: (feedback || (scores && scores.length > 0)) ? 'visible' : 'hidden'
                    }}
                >
                    <p className="feedback-text">{feedback}</p>

                    {scores && scores.length > 0 && (
                        <div className="bars-container">
                            {scores.map((currentRank, index) => {
                                const clue = CLUES[index];

                                // Math for the BEST guess bar (with safeguards in case it's the first guess)
                                const bestRank = bests[index]?.rank || currentRank;
                                const bestWord = bests[index]?.word || guess;

                                if (bestRank === 1) {
                                    return null;
                                }

                                const fillWidth = Math.max(2, 100 * (1 - (Math.log(currentRank) / Math.log(TOTAL_WORDS))));
                                const bestFillWidth = Math.max(2, 100 * (1 - (Math.log(bestRank) / Math.log(TOTAL_WORDS))));

                                // Your color logic
                                const barColor = currentRank <= 250 ? '#81cc75' : currentRank <= 2000 ? '#f8b133' : '#eb5449';

                                return (
                                    <div key={clue} className="score-bar-wrapper">
                                        <span className="score-label">{clue}</span>

                                        <div className="bar-and-best-container">
                                            <div className="score-bar-bg">
                                                <div
                                                    className="best-bar-fill"
                                                    style={{ width: `${bestFillWidth}%` }}
                                                ></div>
                                                <div
                                                    className="score-bar-fill"
                                                    style={{
                                                        width: `${fillWidth}%`,
                                                        backgroundColor: barColor
                                                    }}
                                                ></div>
                                                <span className="score-value">{currentRank}</span>
                                            </div>

                                            <div className="best-score-track" style={{ width: `${bestFillWidth}%` }}>
                                                <span className="best-score">{bestWord}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App