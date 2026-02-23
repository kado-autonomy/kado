import json
import random
import uuid
from pathlib import Path
from datetime import datetime
from typing import Any


class ToolSelectionBandit:
    """Epsilon-greedy contextual bandit for tool selection optimization.

    Each "arm" is a tool name, and the context is the task type. Tracks
    per-tool, per-context success/attempt counts to learn which tools
    work best for which kinds of tasks.
    """

    def __init__(self, model_path: str, epsilon: float = 0.1) -> None:
        self.model_path = Path(model_path)
        self.epsilon = epsilon
        self._data: dict[str, dict[str, dict[str, float]]] = {}
        self._load()

    def _load(self) -> None:
        if self.model_path.exists():
            with open(self.model_path) as f:
                self._data = json.load(f)
        else:
            self._data = {}

    def _save(self) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.model_path, "w") as f:
            json.dump(self._data, f, indent=2)

    def _ensure_context(self, context: str) -> dict[str, dict[str, float]]:
        if context not in self._data:
            self._data[context] = {}
        return self._data[context]

    def _ensure_tool(self, context: str, tool: str) -> dict[str, float]:
        ctx = self._ensure_context(context)
        if tool not in ctx:
            ctx[tool] = {"successes": 0.0, "attempts": 0.0}
        return ctx[tool]

    def get_recommendation(self, context: str) -> list[dict[str, Any]]:
        """Return tools ranked by expected reward for the given context.

        Uses epsilon-greedy: with probability epsilon, returns a random
        ordering to encourage exploration.
        """
        ctx = self._data.get(context, {})
        if not ctx:
            return []

        if random.random() < self.epsilon:
            tools = list(ctx.keys())
            random.shuffle(tools)
            return [
                {
                    "tool": t,
                    "expected_reward": self._expected_reward(context, t),
                    "attempts": int(ctx[t].get("attempts", 0)),
                }
                for t in tools
            ]

        ranked = sorted(ctx.keys(), key=lambda t: self._expected_reward(context, t), reverse=True)
        return [
            {
                "tool": t,
                "expected_reward": self._expected_reward(context, t),
                "attempts": int(ctx[t].get("attempts", 0)),
            }
            for t in ranked
        ]

    def _expected_reward(self, context: str, tool: str) -> float:
        ctx = self._data.get(context, {})
        stats = ctx.get(tool, {})
        attempts = stats.get("attempts", 0.0)
        if attempts == 0:
            return 0.5  # optimistic prior for unexplored tools
        successes = stats.get("successes", 0.0)
        return round(successes / attempts, 4)

    def update(self, context: str, tool: str, reward: float) -> None:
        """Update the bandit's estimates for a tool in a given context."""
        stats = self._ensure_tool(context, tool)
        stats["attempts"] += 1.0
        stats["successes"] += reward
        self._save()

    @staticmethod
    def compute_reward(action_log: dict) -> float:
        """Compute a weighted reward from an action log entry.

        Weights: test_pass_rate (0.4), lint_score (0.2), user_acceptance (0.4).
        All component values are expected in [0, 1].
        """
        result = action_log.get("result", {})
        feedback = action_log.get("feedback", {})

        test_pass_rate = float(result.get("test_pass_rate", 0.0))
        lint_score = float(result.get("lint_score", 0.0))
        user_acceptance = 1.0 if feedback.get("accepted", False) else 0.0

        test_pass_rate = max(0.0, min(1.0, test_pass_rate))
        lint_score = max(0.0, min(1.0, lint_score))

        return round(0.4 * test_pass_rate + 0.2 * lint_score + 0.4 * user_acceptance, 4)


class RLService:
    def __init__(self, data_dir: str = "./data/rl") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.actions_file = self.data_dir / "actions.jsonl"
        self.feedback_file = self.data_dir / "feedback.jsonl"
        self.last_optimize_file = self.data_dir / "last_optimize.json"
        self.bandit = ToolSelectionBandit(
            model_path=str(self.data_dir / "bandit_model.json"),
        )

    def log_action(self, action: str, context: dict, result: dict) -> str:
        action_id = str(uuid.uuid4())
        record = {
            "id": action_id,
            "action": action,
            "context": context,
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
        }
        with open(self.actions_file, "a") as f:
            f.write(json.dumps(record) + "\n")
        return action_id

    def record_feedback(self, action_id: str, accepted: bool) -> None:
        record = {
            "action_id": action_id,
            "accepted": accepted,
            "timestamp": datetime.utcnow().isoformat(),
        }
        with open(self.feedback_file, "a") as f:
            f.write(json.dumps(record) + "\n")

    def get_stats(self) -> dict:
        total_actions = 0
        feedback_by_action: dict[str, bool] = {}

        if self.actions_file.exists():
            with open(self.actions_file) as f:
                for line in f:
                    if line.strip():
                        total_actions += 1

        if self.feedback_file.exists():
            with open(self.feedback_file) as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        aid = data.get("action_id")
                        if aid:
                            feedback_by_action[aid] = data.get("accepted", False)

        accepted_count = sum(1 for v in feedback_by_action.values() if v)
        rejected_count = len(feedback_by_action) - accepted_count
        feedback_count = len(feedback_by_action)
        acceptance_rate = accepted_count / feedback_count if feedback_count > 0 else 0.0

        return {
            "total_actions": total_actions,
            "total_feedback": feedback_count,
            "accepted": accepted_count,
            "rejected": rejected_count,
            "acceptance_rate": round(acceptance_rate, 4),
        }

    def _load_actions_since_last_optimize(self) -> list[dict]:
        last_ts: str | None = None
        if self.last_optimize_file.exists():
            with open(self.last_optimize_file) as f:
                meta = json.load(f)
                last_ts = meta.get("timestamp")

        actions: list[dict] = []
        if not self.actions_file.exists():
            return actions

        with open(self.actions_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                if last_ts and record.get("timestamp", "") <= last_ts:
                    continue
                actions.append(record)
        return actions

    def _load_feedback_map(self) -> dict[str, bool]:
        feedback_map: dict[str, bool] = {}
        if not self.feedback_file.exists():
            return feedback_map
        with open(self.feedback_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                aid = data.get("action_id")
                if aid:
                    feedback_map[aid] = data.get("accepted", False)
        return feedback_map

    def optimize(self) -> dict:
        actions = self._load_actions_since_last_optimize()
        if not actions:
            return {
                "status": "ok",
                "actions_processed": 0,
                "message": "No new actions to process",
            }

        feedback_map = self._load_feedback_map()

        rewards: list[float] = []
        for action_log in actions:
            action_id = action_log.get("id", "")
            tool = action_log.get("action", "unknown")
            context = action_log.get("context", {})
            task_type = context.get("task_type", "general")

            enriched = {**action_log}
            if action_id in feedback_map:
                enriched["feedback"] = {"accepted": feedback_map[action_id]}
            else:
                enriched["feedback"] = {"accepted": False}

            reward = ToolSelectionBandit.compute_reward(enriched)
            rewards.append(reward)
            self.bandit.update(task_type, tool, reward)

        now = datetime.utcnow().isoformat()
        with open(self.last_optimize_file, "w") as f:
            json.dump({"timestamp": now}, f)

        avg_reward = sum(rewards) / len(rewards) if rewards else 0.0
        reward_min = min(rewards) if rewards else 0.0
        reward_max = max(rewards) if rewards else 0.0

        contexts = set()
        for a in actions:
            contexts.add(a.get("context", {}).get("task_type", "general"))

        recommendations: dict[str, list] = {}
        for ctx in contexts:
            recommendations[ctx] = self.bandit.get_recommendation(ctx)

        return {
            "status": "ok",
            "actions_processed": len(actions),
            "reward_distribution": {
                "mean": round(avg_reward, 4),
                "min": round(reward_min, 4),
                "max": round(reward_max, 4),
            },
            "recommendations": recommendations,
        }

    def recommend(self, context: str) -> list[dict]:
        return self.bandit.get_recommendation(context)
