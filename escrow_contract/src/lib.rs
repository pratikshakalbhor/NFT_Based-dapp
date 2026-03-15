#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token,
    Address, Env, String, Symbol,
};

const JOB_COUNT: Symbol = symbol_short!("JCOUNT");

// ─── Types ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum JobStatus {
    Open,
    InProgress,
    Submitted,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct Job {
    pub id: u32,
    pub client: Address,
    /// Placeholder = client while Open; set to real freelancer on accept
    pub freelancer: Address,
    pub title: String,
    pub description: String,
    /// Amount in stroops (1 XLM = 10_000_000)
    pub amount: i128,
    pub status: JobStatus,
    pub work_url: String,
    /// The token contract address used for this job (native XLM or any SAC)
    pub token_address: Address,
    pub created_at: u64,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    // ── 1. post_job ───────────────────────────────────────────────────────────
    /// Client approves the contract to spend `amount` stroops, then calls this.
    /// XLM is transferred from `client` → this contract and locked here.
    pub fn post_job(
        env: Env,
        client: Address,
        title: String,
        description: String,
        amount: i128,
        token_address: Address,
    ) -> u32 {
        client.require_auth();

        // Lock XLM inside this contract
        let token = token::Client::new(&env, &token_address);
        token.transfer(&client, &env.current_contract_address(), &amount);

        // Increment job counter
        let count: u32 = env.storage().instance().get(&JOB_COUNT).unwrap_or(0);
        let job_id = count + 1;

        let job = Job {
            id: job_id,
            client: client.clone(),
            freelancer: client.clone(), // placeholder until accepted
            title,
            description,
            amount,
            status: JobStatus::Open,
            work_url: String::from_str(&env, ""),
            token_address,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);
        env.storage().instance().set(&JOB_COUNT, &job_id);

        env.events().publish(
            (symbol_short!("POSTED"), client),
            (job_id, amount),
        );

        job_id
    }

    // ── 2. accept_job ─────────────────────────────────────────────────────────
    /// Freelancer accepts an Open job → status becomes InProgress.
    pub fn accept_job(env: Env, freelancer: Address, job_id: u32) {
        freelancer.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::Open, "Job is not open");

        job.freelancer = freelancer.clone();
        job.status = JobStatus::InProgress;

        env.storage()
            .persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events()
            .publish((symbol_short!("ACCEPTED"), freelancer), job_id);
    }

    // ── 3. submit_work ────────────────────────────────────────────────────────
    /// Assigned freelancer submits a work URL → status becomes Submitted.
    pub fn submit_work(env: Env, freelancer: Address, job_id: u32, work_url: String) {
        freelancer.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::InProgress, "Job not in progress");
        assert!(job.freelancer == freelancer, "Not the assigned freelancer");

        job.work_url = work_url;
        job.status = JobStatus::Submitted;

        env.storage()
            .persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events()
            .publish((symbol_short!("SUBMIT"), freelancer), job_id);
    }

    // ── 4. approve_and_pay ────────────────────────────────────────────────────
    /// Client approves submitted work.
    /// XLM is transferred from this contract → freelancer automatically.
    pub fn approve_and_pay(env: Env, client: Address, job_id: u32) {
        client.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::Submitted, "Work not submitted");
        assert!(job.client == client, "Not the job client");

        let freelancer = job.freelancer.clone();
        let amount = job.amount;
        let token_address = job.token_address.clone();

        job.status = JobStatus::Completed;

        env.storage()
            .persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        // Release locked XLM from contract → freelancer
        let token = token::Client::new(&env, &token_address);
        token.transfer(&env.current_contract_address(), &freelancer, &amount);

        env.events().publish(
            (symbol_short!("APPROVED"), client),
            (job_id, freelancer, amount),
        );
    }

    // ── 5. cancel_job ─────────────────────────────────────────────────────────
    /// Client cancels an Open or InProgress job.
    /// XLM is refunded from this contract → client.
    pub fn cancel_job(env: Env, client: Address, job_id: u32) {
        client.require_auth();

        let mut job: Job = env
            .storage()
            .persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.client == client, "Not the job client");
        assert!(
            job.status == JobStatus::Open || job.status == JobStatus::InProgress,
            "Cannot cancel: work already submitted or job is finished"
        );

        let amount = job.amount;
        let token_address = job.token_address.clone();

        job.status = JobStatus::Cancelled;

        env.storage()
            .persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        // Refund locked XLM from contract → client
        let token = token::Client::new(&env, &token_address);
        token.transfer(&env.current_contract_address(), &client, &amount);

        env.events()
            .publish((symbol_short!("CANCEL"), client), (job_id, amount));
    }

    // ── 6. get_job ────────────────────────────────────────────────────────────
    pub fn get_job(env: Env, job_id: u32) -> Job {
        env.storage()
            .persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap()
    }

    // ── 7. get_total ──────────────────────────────────────────────────────────
    pub fn get_total(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&JOB_COUNT)
            .unwrap_or(0)
    }
}