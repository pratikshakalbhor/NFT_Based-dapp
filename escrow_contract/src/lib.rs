#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol,
};

const JOB_COUNT: Symbol = symbol_short!("JCOUNT");

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
    pub freelancer: Address,
    pub title: String,
    pub description: String,
    pub amount: i128,
    pub status: JobStatus,
    pub work_url: String,
    pub created_at: u64,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    pub fn post_job(
        env: Env,
        client: Address,
        title: String,
        description: String,
        amount: i128,
    ) -> u32 {
        client.require_auth();

        let count: u32 = env.storage().instance()
            .get(&JOB_COUNT)
            .unwrap_or(0);
        let job_id = count + 1;

        let job = Job {
            id: job_id,
            client: client.clone(),
            freelancer: client.clone(), // placeholder
            title,
            description,
            amount,
            status: JobStatus::Open,
            work_url: String::from_str(&env, ""),
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);
        env.storage().instance()
            .set(&JOB_COUNT, &job_id);

        env.events().publish(
            (symbol_short!("POSTED"), client),
            (job_id, amount),
        );

        job_id
    }

    pub fn accept_job(
        env: Env,
        freelancer: Address,
        job_id: u32,
    ) {
        freelancer.require_auth();

        let mut job: Job = env.storage().persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::Open, "Job is not open");

        job.freelancer = freelancer.clone();
        job.status = JobStatus::InProgress;

        env.storage().persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events().publish(
            (symbol_short!("ACCEPTED"), freelancer),
            job_id,
        );
    }

    pub fn submit_work(
        env: Env,
        freelancer: Address,
        job_id: u32,
        work_url: String,
    ) {
        freelancer.require_auth();

        let mut job: Job = env.storage().persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::InProgress, "Job not in progress");
        assert!(job.freelancer == freelancer, "Not assigned freelancer");

        job.work_url = work_url;
        job.status = JobStatus::Submitted;

        env.storage().persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events().publish(
            (symbol_short!("SUBMIT"), freelancer),
            job_id,
        );
    }

    pub fn approve_job(
        env: Env,
        client: Address,
        job_id: u32,
    ) {
        client.require_auth();

        let mut job: Job = env.storage().persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.status == JobStatus::Submitted, "Work not submitted");
        assert!(job.client == client, "Not the job client");

        job.status = JobStatus::Completed;

        env.storage().persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events().publish(
            (symbol_short!("APPROVED"), client),
            (job_id, job.freelancer.clone(), job.amount),
        );
    }

    pub fn cancel_job(
        env: Env,
        client: Address,
        job_id: u32,
    ) {
        client.require_auth();

        let mut job: Job = env.storage().persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap();

        assert!(job.client == client, "Not the job client");
        assert!(
            job.status == JobStatus::Open || job.status == JobStatus::InProgress,
            "Cannot cancel"
        );

        job.status = JobStatus::Cancelled;

        env.storage().persistent()
            .set(&(symbol_short!("JOB"), job_id), &job);

        env.events().publish(
            (symbol_short!("CANCEL"), client),
            job_id,
        );
    }

    pub fn get_job(env: Env, job_id: u32) -> Job {
        env.storage().persistent()
            .get(&(symbol_short!("JOB"), job_id))
            .unwrap()
    }

    pub fn get_total(env: Env) -> u32 {
        env.storage().instance()
            .get(&JOB_COUNT)
            .unwrap_or(0)
    }
}